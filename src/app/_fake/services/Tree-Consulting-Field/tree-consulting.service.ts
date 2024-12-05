import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; 
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { TranslationService } from 'src/app/modules/i18n/translation.service';
import { map, catchError, finalize } from 'rxjs/operators';

export interface IConsultingTree {
  key: number;
  label: string;
  children: IConsultingTree[];
}

@Injectable({
  providedIn: 'root'
})
export class ConsultingTreeService {
  private apiUrl = 'https://myinsighta.com/api/consulting-field/tree'; 
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$: Observable<boolean> = this.isLoadingSubject.asObservable();
  currentLang: any = 'en';

  constructor(
    private http: HttpClient,
    private translationService: TranslationService
  ) {
    this.translationService.onLanguageChange().subscribe(lang => {
      this.currentLang = lang || 'en';
    
    });
    
  }

  private setLoading(loading: boolean) {
    this.isLoadingSubject.next(loading);
  }

  private handleError(error: any) {
    console.log("error",error);
    return throwError(error);
  }

  private transformToTreeNode(isicData: IConsultingTree[]): any[] {
    return isicData.map(node => ({
      key: node.key,
      label: node.label,
      data: {
        key: node.key,
        label: node.label,
      },
      children: node.children ? this.transformToTreeNode(node.children) : []
    }));
  }

  private transformToTreeNodeParent(isicData: any[]): any[] {
    return isicData.map(node => ({
      key: node.key,
      label: node.label,
      data: {
        key: node.key,
        code: node.code,
        label: node.label,
      },
      children: node.children ? this.transformToTreeNodeParent(node.children) : []
    }));
  }

  // Fetch ISIC Codes data from the API
  getIsicCodesTree(lang:string): Observable<any[]> {
    const headers = new HttpHeaders({
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'lang': lang
    });

    this.setLoading(true);
    return this.http.get<any>(this.apiUrl, { headers }).pipe(
      map((res) => this.transformToTreeNode(res)),
      catchError((error) => this.handleError(error)),
      finalize(() => this.setLoading(false))
    );
  }

 

}