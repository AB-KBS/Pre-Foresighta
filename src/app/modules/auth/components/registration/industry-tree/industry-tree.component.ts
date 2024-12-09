import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Observable, Subscription, fromEvent } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { TranslationService } from 'src/app/modules/i18n';
import { IndustryService } from '../../industry.service';
import { TreeNode } from '../consulting-field-tree/consTree';

@Component({
  selector: 'app-industry-tree',
  templateUrl: './industry-tree.component.html',
  styleUrls: ['./industry-tree.component.scss']
})
export class IndustryTreeComponent implements OnInit, OnDestroy {
  isLoadingIsicCodes$: Observable<boolean>;
  resizeSubscription!: Subscription;
  dialogWidth: string = '50vw';
  selectedNodes: TreeNode[] = [];
  isISICDialogVisible: boolean = false;
  nodes: TreeNode[] = []; 
  lang: string = 'en';
  private unsubscribe: Subscription[] = [];
  private isSelectAllProcessing: boolean = false;
  
  @Output() nodesEmit = new EventEmitter<any>();

  constructor(
    public translate: TranslationService,
    private _industry: IndustryService,
  ) {
    this.isLoadingIsicCodes$ = this._industry.isLoading$;
  }

  ngOnInit(): void {
    this.windowResize();

    const langSub = this.translate.onLanguageChange().subscribe((lang) => {
      this.selectedNodes = [];
      this.lang = lang;
      this.loadISIC(); // Reload tree on language change
    });
    this.unsubscribe.push(langSub);

    this.loadISIC();
  }

  ngOnDestroy(): void {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
  }

  loadISIC() {
    const isicSub = this._industry.getIsicCodesTree(this.lang || 'en').subscribe({
      next: (res: TreeNode[]) => {
        const selectAllLabel = this.lang === 'ar' ? 'اختر الكل' : 'Select All';
        const selectAllNode: TreeNode = {
          key: 'selectAll',
          label: selectAllLabel,
          data: { key: 'selectAll', label: selectAllLabel },
          children: res,
          expanded: true
        };

        // Add "Other" options to the tree
        this.nodes = this.addOtherOption([selectAllNode]);
      },
      error: (err: any) => {
        console.error('Error fetching ISIC codes:', err);
      },
    });
    this.unsubscribe.push(isicSub);
  }

  /**
   * Add "Other" nodes at the required hierarchy levels.
   * 
   * Level definitions (similar to consulting):
   * Level 0: "Select All" node
   * Level 1: Industry nodes
   * Level 2: Sub-industry nodes, etc.
   * 
   * We will add an "Other" node at level 0 (under Select All) and at level 1 (under each industry).
   */
  addOtherOption(nodes: TreeNode[], level: number = 0): TreeNode[] {
    if (!nodes) return [];

    return nodes.map(node => {
      // Process children recursively
      if (node.children && node.children.length > 0) {
        node.children = this.addOtherOption(node.children, level + 1);
      }

      // Add "Other" node at level 0 and level 1 (similar to the consulting field logic)
      if (level === 0 || level === 1) {
        const otherLabel = this.lang === 'ar' ? 'أخرى' : 'Other';
        const otherNode: TreeNode = {
          key: `${node.key}-other`,
          label: otherLabel,
          data: { key: `${node.key}-other`, label: 'Other' },
          isOther: true,
          selectable: false,
          children: []
        };

        node.children = [...(node.children || []), otherNode];
      }

      return node;
    });
  }

  /**
   * Handles input changes on "Other" nodes.
   */
  onOtherInput(node: TreeNode): void {
    if (node.data.customInput && node.data.customInput.trim() !== '') {
      // If input is not empty, ensure the node is selected
      if (!this.selectedNodes.some((selectedNode) => selectedNode.key === node.key)) {
        this.selectedNodes = [...this.selectedNodes, node];
      }
    } else {
      // If input is empty, deselect the node
      this.selectedNodes = this.selectedNodes.filter(
        (selectedNode) => selectedNode.key !== node.key
      );
    }
    // Update 'Select All' state if necessary
    this.updateSelectAllState();
  }

  /**
   * Returns a comma-separated string of selected nodes' labels, excluding "Select All".
   * For "Other" nodes, if custom input is provided, it will display that instead of the default label.
   */
  selectedNodesLabel(): string {
    if (this.selectedNodes && this.selectedNodes.length > 0) {
      // Exclude "Select All" from the display
      const filteredNodes = this.selectedNodes.filter((node: TreeNode) => node.key !== 'selectAll');
      return filteredNodes.map((node: TreeNode) => {
        if (node.isOther) {
          return node.data.customInput ? node.data.customInput : node.label;
        } else {
          return node.label;
        }
      }).join(', ');
    } else {
      return '';
    }
  }

  /**
   * Shows the ISIC Codes Selection Dialog.
   */
  showISICDialog() {
    this.isISICDialogVisible = true;
  }

  /**
   * Handles the OK action in the dialog.
   */
  onISICDialogOK() {
    this.isISICDialogVisible = false;
    if (this.selectedNodes.length > 0) {
      this.nodesEmit.emit(this.selectedNodes);
    }
  }

  /**
   * Handles the Cancel action in the dialog.
   */
  onISICDialogCancel() {
    this.isISICDialogVisible = false;
  }

  /**
   * Handles node selection.
   */
  onNodeSelect(event: any): void {
    if (this.isSelectAllProcessing) return; // Prevent recursion

    if (event.node.key === 'selectAll') {
      // "Select All" node was selected
      this.toggleSelectAll(true);
    } else {
      // Check if all nodes are selected to update "Select All"
      this.updateSelectAllState();
    }
  }

  /**
   * Handles node unselection.
   */
  onNodeUnselect(event: any): void {
    if (this.isSelectAllProcessing) return; // Prevent recursion

    if (event.node.key === 'selectAll') {
      // "Select All" node was unselected
      this.toggleSelectAll(false);
    } else {
      // Check if "Select All" needs to be unchecked
      this.updateSelectAllState();
    }
  }

  /**
   * Toggles the selection of all nodes based on the "Select All" state.
   */
  toggleSelectAll(isChecked: boolean): void {
    if (this.isSelectAllProcessing) return; // Prevent recursion

    this.isSelectAllProcessing = true;

    if (isChecked) {
      // Select all nodes
      const allNodes = this.flattenTree(this.nodes[0]); // Includes "Select All"
      this.selectedNodes = allNodes; // Select all, including "Select All"
    } else {
      // Deselect all nodes
      // Before deselecting, clear any custom inputs on other nodes if you wish (optional)
      this.selectedNodes = [];
    }

    this.isSelectAllProcessing = false;
  }

  /**
   * Updates the "Select All" node based on current selections.
   */
  updateSelectAllState(): void {
    const allChildNodes = this.getAllChildNodes(this.nodes);
    const selectedKeys = new Set(this.selectedNodes.map((node: TreeNode) => node.key));

    const isAllSelected = allChildNodes.every(node => selectedKeys.has(node.key));
    const selectAllNode = this.nodes.find((node: TreeNode) => node.key === 'selectAll');

    if (isAllSelected) {
      if (selectAllNode && !selectedKeys.has(selectAllNode.key)) {
        // Select "Select All" node if not already selected
        this.isSelectAllProcessing = true;
        this.selectedNodes = [selectAllNode, ...this.selectedNodes];
        this.isSelectAllProcessing = false;
      }
    } else {
      if (selectAllNode && selectedKeys.has(selectAllNode.key)) {
        // Deselect "Select All" node if it's selected
        this.isSelectAllProcessing = true;
        this.selectedNodes = this.selectedNodes.filter((node: TreeNode) => node.key !== 'selectAll');
        this.isSelectAllProcessing = false;
      }
    }
  }

  /**
   * Flattens the tree into a single array of nodes.
   */
  flattenTree(node: TreeNode, allNodes: TreeNode[] = []): TreeNode[] {
    allNodes.push(node);
    if (node.children) {
      node.children.forEach(childNode => this.flattenTree(childNode, allNodes));
    }
    return allNodes;
  }

  /**
   * Retrieves all child nodes excluding the "Select All" node.
   */
  private getAllChildNodes(nodes: TreeNode[]): TreeNode[] {
    let allNodes: TreeNode[] = [];
    nodes.forEach(node => {
      if (node.key !== 'selectAll') {
        allNodes.push(node);
        if (node.children && node.children.length > 0) {
          allNodes = allNodes.concat(this.getAllChildNodes(node.children));
        }
      }
    });
    return allNodes;
  }

  /**
   * Handles window resize to adjust dialog width responsively.
   */
  windowResize() {
    const screenwidth$ = fromEvent(window, 'resize').pipe(
      map(() => window.innerWidth),
      startWith(window.innerWidth)
    );

    this.resizeSubscription = screenwidth$.subscribe((width) => {
      this.dialogWidth = width < 768 ? '100vw' : '70vw';
      console.log('Dialog Width:', this.dialogWidth);
    });
  }
}
