import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Observable, Subscription, fromEvent, map, startWith } from 'rxjs';
import { ConsultingTreeService } from 'src/app/_fake/services/Tree-Consulting-Field/tree-consulting.service';
import { TranslationService } from 'src/app/modules/i18n';
import { TreeNode } from './consTree';

@Component({
  selector: 'app-consulting-field-tree',
  templateUrl: './consulting-field-tree.component.html',
  styleUrls: ['./consulting-field-tree.component.scss']
})
export class ConsultingFieldTreeComponent implements OnInit, OnDestroy {
  isLoadingTreeCons$: Observable<boolean>;
  private unsubscribe: Subscription[] = [];
  lang: string;
  dialogWidth: string = '50vw';
  isISICDialogVisible: boolean;
  consultingNodes: TreeNode[];
  resizeSubscription!: Subscription;
  selectedNodesCons: TreeNode[] = [];
  private isSelectAllProcessing: boolean = false;
  @Output() nodesEmit  =  new EventEmitter<any>
  constructor(
    private _consultingTree: ConsultingTreeService,
    public translate: TranslationService
  ) {
    this.isLoadingTreeCons$ = this._consultingTree.isLoading$;
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }

  ngOnInit(): void {
    this.windowResize();
    this.translate.onLanguageChange().subscribe((lang) => {
      this.lang = lang;
    });
    this.getTreeConsulting();
  }

  getTreeConsulting() {
    const treeSub = this._consultingTree.getIsicCodesTree(this.lang || 'en').subscribe({
      next: (res: TreeNode[]) => {
        // Process the tree nodes to add 'Other' nodes
        const processedNodes = res
        // Prepend "Select All" node with translated label and expanded by default
        const selectAllLabel = this.lang ==='ar' ? 'اختر الكل': 'Select All';
        const selectAllNode: TreeNode = {
          key: 'selectAll',
          label: selectAllLabel,
          data: { key: 'selectAll', label: selectAllLabel },
          children: processedNodes,
          expanded: true // Expand the "Select All" node by default
        };
        this.consultingNodes = this.addOtherOption([selectAllNode]);
        console.log('consultingNodes', JSON.stringify(this.consultingNodes));
      },
      error: (error) => {
        console.error('Error fetching consulting nodes', error);
      }
    });
    this.unsubscribe.push(treeSub);
  }

  // Updated addOtherOption function
// We'll pass the current level as a parameter. 
// Level 1: "Select All"
// Level 2: "Consulting Field"
// Level 3: "Sub Field"

addOtherOption(nodes: TreeNode[], level: number = 0): TreeNode[] {
  if (!nodes) return [];

  return nodes.map(node => {
    // First, process children recursively
    if (node.children && node.children.length > 0) {
      node.children = this.addOtherOption(node.children, level + 1);
    }

    // Now decide if this node should have a single "Other" option appended:
    // Level definitions based on your hierarchy:
    // Level 1: "Select All" node
    // Level 2: Consulting Fields
    // Level 3: Sub Fields

    // We want:
    // - For the "Select All" node (level 1), after its children (the consulting fields), add a single Other.
    // - For each Consulting Field node (level 2), after its children (the sub-fields), add a single Other.

    if (level === 0 || level ===1 ) {
      // Add a single "Other" node at the end of the current node's children
      const otherNode: TreeNode = {
        key: `${node.key}-other`,
        label: this.lang === 'ar' ? 'أخرى' : 'Other',
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

  onOtherInput(node: TreeNode): void {
    if (node.data.customInput && node.data.customInput.trim() !== '') {
      // If input is not empty, select the node
      if (!this.selectedNodesCons.some((selectedNode) => selectedNode.key === node.key)) {
        this.selectedNodesCons = [...this.selectedNodesCons, node];
      }
    } else {
      // If input is empty, deselect the node
      this.selectedNodesCons = this.selectedNodesCons.filter(
        (selectedNode) => selectedNode.key !== node.key
      );
    }
    // Update 'Select All' state if necessary
    this.updateSelectAllState();
  }
  /**
   * Shows the ISIC Codes Selection Dialog.
   */
  showISICDialogCons() {
    this.isISICDialogVisible = true;
  }

  /**
   * Handles the OK action in the dialog.
   */
  onISICDialogOKCons() {
    // Perform any necessary actions with the selected nodes
    this.isISICDialogVisible = false;
    // Optionally, trigger form validation or submission here

    if(this.selectedNodesCons.length>0){
      this.nodesEmit.emit(this.selectedNodesCons);
    }
  }

  /**
   * Handles the Cancel action in the dialog.
   */
  onISICDialogCancelCons() {
    this.isISICDialogVisible = false;
    // Optionally, reset selections or perform other actions
  }

  /**
   * Returns a comma-separated string of selected nodes' labels.
   */
  selectedNodesLabelCons(): string {
    if (this.selectedNodesCons && this.selectedNodesCons.length > 0) {
      // Exclude "Select All" from the display
      const filteredNodes = this.selectedNodesCons.filter((node: any) => node.key !== 'selectAll');
      return filteredNodes
        .map((node: any) => {
          if (node.isOther) {
            return node.data.customInput ? node.data.customInput : node.label;
          } else {
            return node.label;
          }
        })
        .join(', ');
    } else {
      return '';
    }
  }

  flattenTree(node: TreeNode, allNodes: TreeNode[] = []): TreeNode[] {
    allNodes.push(node);
    if (node.children) {
      node.children.forEach((childNode) => this.flattenTree(childNode, allNodes));
    }
    return allNodes;
  }

  toggleSelectAll(isChecked: boolean): void {
    if (this.isSelectAllProcessing) return; // Prevent recursion

    this.isSelectAllProcessing = true;

    if (isChecked) {
      // Select all nodes
      const allNodes = this.flattenTree(this.consultingNodes[0]); // Includes "Select All"
      this.selectedNodesCons = allNodes; // Select all, including "Select All"
    } else {
      // Deselect all nodes
      this.selectedNodesCons = [];
    }

    this.isSelectAllProcessing = false;
  }

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

  updateSelectAllState(): void {
    const allChildNodes = this.getAllChildNodes(this.consultingNodes);
    const selectedKeys = new Set(this.selectedNodesCons.map((node: any) => node.key));

    const isAllSelected = allChildNodes.every((node) => selectedKeys.has(node.key));

    const selectAllNode = this.consultingNodes.find((node: any) => node.key === 'selectAll');

    if (isAllSelected) {
      if (selectAllNode && !selectedKeys.has(selectAllNode.key)) {
        // Select "Select All" node if not already selected
        this.isSelectAllProcessing = true;
        this.selectedNodesCons = [selectAllNode, ...this.selectedNodesCons];
        this.isSelectAllProcessing = false;
      }
    } else {
      if (selectAllNode && selectedKeys.has(selectAllNode.key)) {
        // Deselect "Select All" node if it's selected
        this.isSelectAllProcessing = true;
        this.selectedNodesCons = this.selectedNodesCons.filter((node: any) => node.key !== 'selectAll');
        this.isSelectAllProcessing = false;
      }
    }
  }

  private getAllChildNodes(nodes: TreeNode[]): TreeNode[] {
    let allNodes: TreeNode[] = [];
    nodes.forEach((node) => {
      if (node.key !== 'selectAll') {
        allNodes.push(node);
        if (node.children && node.children.length > 0) {
          allNodes = allNodes.concat(this.getAllChildNodes(node.children));
        }
      }
    });
    return allNodes;
  }

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
