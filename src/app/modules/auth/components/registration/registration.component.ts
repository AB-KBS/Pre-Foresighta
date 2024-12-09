import { UpgradePlanModalComponent } from './../../../../_metronic/partials/layout/modals/upgrade-plan-modal/upgrade-plan-modal.component';
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subscription, Observable, fromEvent } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ConfirmPasswordValidator } from './confirm-password.validator';
import { first, map, startWith } from 'rxjs/operators';
import { CountryService } from 'src/app/_fake/services/countries-api/countries-get.service';
import { ICountry } from 'src/app/_fake/models/country.model';
import { TranslationService } from 'src/app/modules/i18n';
import { ConsultingFieldService, otherfiled } from 'src/app/_fake/services/consulting-field/consulting-field.service';
import { HSCodeService } from 'src/app/_fake/services/hs-code/hs-code.service';
import { UserPreRegistration } from 'src/app/_fake/models/pre-user.model';
import { PreRegsiterService } from 'src/app/_fake/services/pre-register/pre-regsiter.service';
import { ScrollAnimsService } from 'src/app/_fake/services/scroll-anims/scroll-anims.service';
import { Message, TreeNode } from 'primeng/api';
import { IsicService } from 'src/app/_fake/services/isic/isic.service';
import { IsicCodesService } from 'src/app/_fake/services/industry/industry.service';
import { NgbCarousel } from '@ng-bootstrap/ng-bootstrap';
import { ConsultingTreeService } from 'src/app/_fake/services/Tree-Consulting-Field/tree-consulting.service';

@Component({
  selector: 'app-registration',
  templateUrl: './preregistraion.component.html',
  styleUrls: ['./registration.component.scss'],
})
export class RegistrationComponent implements OnInit, OnDestroy {
  isLoading$: Observable<boolean>;
  isLoadingConsultingFields$: Observable<boolean>;
  isLoadingSubmit$: Observable<boolean>;

  isLoadingCountires$: Observable<boolean>;
  isLoadingHSCodes$: Observable<boolean>;

  dialogWidth: string = '50vw';
  reverseLoader:boolean=false;

  selectedCountry: any;

  messages: Message[] = [];
  passwordFieldType: string = 'password';
  confirmPasswordFieldType: string = 'password';
  registrationForm: FormGroup;
  hasError: boolean = false;

  consultingFields: any[] = [];
  isic: any;
  isicCodes: any[] = [];

  hsCodes: any[] = [];
  optionLabelHSCode: string;
  lang: string;
  isOtherSelected: boolean = false;
  private unsubscribe: Subscription[] = [];
  optionLabelField: string = 'description.en';
  optionLabel: string = 'name.en';
  countries: ICountry[];
  
  selectedConsultingFieldNodes = []
  selectedIndustryNodes =[]
  resizeSubscription!: Subscription;

  consultingNodes = [];
  otherConsultingNodes =[];

  industryNodes = [];
  otherIndustryNodes =[];
  @ViewChild('carousel', { static: true }) carousel!: NgbCarousel;

  currentSlide: number = 0;

  slides = [
    {
      title: 'AUTH.REGISTRATION.SLIDE_ONE',
      text: 'AUTH.REGISTRATION.SLIDE_ONE_CONTENT'
    },
    {
      title: 'AUTH.REGISTRATION.SLIDE_TWO',
      text: 'AUTH.REGISTRATION.SLIDE_TWO_CONTENT'
    },
    {
      title: 'AUTH.REGISTRATION.SLIDE_THREE',
      text: 'AUTH.REGISTRATION.SLIDE_THREE_CONTENT'
    }
  ];

  // Navigate to the previous slide
  prevSlide() {
    this.carousel.prev();
  }

  // Navigate to the next slide
  nextSlide() {
    this.carousel.next();
  }

  // Select a specific slide
  selectSlide(slideNumber: number) {
    this.carousel.select(`slide-${slideNumber}`);
    this.currentSlide = slideNumber;
  }
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private _countriesGet: CountryService,
    public translate: TranslationService,
    private _consultingFieldsService: ConsultingFieldService,
    private _hsCodeService: HSCodeService,
    private _register: PreRegsiterService,
    private scrollAnims: ScrollAnimsService,
    private _industry:IsicCodesService,

  ) {
    this.isLoading$ = this.authService.isLoading$;
    this.isLoadingCountires$ = this._countriesGet.isLoading$;
    this.isLoadingConsultingFields$ = this._consultingFieldsService.isLoading$;
    this.isLoadingHSCodes$ = this._hsCodeService.isLoading$;
    this.isLoadingSubmit$ = this._register.isLoading$;

  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.scrollAnims.scrollAnimations();
    }, 100);
  }
  ngOnInit(): void {

    //  window.addEventListener('resize', this.updateDialogWidth.bind(this));
    this.translate.onLanguageChange().subscribe((lang) => {
      this.lang = lang;
    });
    this.getListOfCountries();
    this.initForm();
    this.windowResize()
  }
  windowResize(){
    const screenwidth$ = fromEvent(window,'resize').pipe(
      map(()=>window.innerWidth),
      startWith(window.innerWidth)
    );

    this.resizeSubscription = screenwidth$.subscribe((width)=>{
      this.dialogWidth = width <768 ? '100vw' : '70vw';
      console.log(this.dialogWidth);
    })
  }



  getListOfCountries() {
    const getCountriesSub = this._countriesGet.getCountries(this.lang ? this.lang : 'en').subscribe({
      next: (res) => {
        this.countries = res.map((country: ICountry) => ({
          ...country,
          flagPath: `../../../../../assets/media/flags/${country.flag}.svg`,
        }));
        this.updateCountryLabels();
      },
      error: (err) => {
        console.log('err', err);
      },
    });
    this.unsubscribe.push(getCountriesSub);
  }

  updateCountryLabels() {
    this.countries = this.countries.map((country:any) => ({
      ...country,
      label: country.name[this.lang] || country.name.en
    }));
  }

  onImageError(country: any): void {
    country.flagPath = `../../../../../assets/media/flags/default.svg`; // Set a default image path
  }

  getEmittedConsultingFields(event: any) {
    this.selectedConsultingFieldNodes = event;
    console.log("selectedConsultingFieldNodes", this.selectedConsultingFieldNodes);

    // Split results into two arrays
    const numberKeys = this.selectedConsultingFieldNodes.filter((node: any) => typeof node.key === 'number');
    const stringKeys = this.selectedConsultingFieldNodes.filter((node: any) => 
        typeof node.key === 'string' && node.key !== 'selectAll' && node.data.customInput !== undefined  && node.data.customInput !== null
    );

    console.log("Nodes with number keys:", numberKeys);
    console.log("Nodes with string keys (excluding 'selectAll'):", stringKeys);
    this.consultingNodes = numberKeys;
    this.otherIndustryNodes = stringKeys;
   
}
  getEmittedIndustries(event:any){
    this.selectedIndustryNodes = event
    console.log("selectedIndustryNodes",this.selectedIndustryNodes);

     // Split results into two arrays
     const numberKeys = this.selectedIndustryNodes.filter((node: any) => typeof node.key === 'number');
     const stringKeys = this.selectedIndustryNodes.filter((node: any) => 
         typeof node.key === 'string' && node.key !== 'selectAll' && node.data.customInput !== undefined  && node.data.customInput !== null
     );
 
     console.log("Nodes with number keys:", numberKeys);
     console.log("Nodes with string keys (excluding 'selectAll'):", stringKeys);
     this.industryNodes = numberKeys;
     this.otherIndustryNodes = stringKeys;
  }
  initForm() {
    this.registrationForm = this.fb.group(
      {
        firstName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
        lastName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
        aboutDescription: [''],
        email: ['', [Validators.required, Validators.email, Validators.minLength(3), Validators.maxLength(320)]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.maxLength(100),
            Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\W_]{8,}$/),
          ],
        ],
        agree: [true],
      },
      {
        validator: ConfirmPasswordValidator.MatchPassword,
      }
    );
  }
  
prepareFormData(){
  const formData = new FormData();
  formData.append('first_name', this.registrationForm.get('firstName')?.value);
  formData.append('last_name', this.registrationForm.get('lastName')?.value);
  formData.append('email', this.registrationForm.get('email')?.value);
  formData.append('password', this.registrationForm.get('password')?.value);
  formData.append('confirm_password', this.registrationForm.get('password')?.value);
  formData.append('country_id', this.selectedCountry.id);
  formData.append('about', this.registrationForm.get('aboutDescription')?.value);
  console.log("consultingFields",this.consultingFields);
  if(this.consultingNodes.length>0){
    this.consultingNodes.forEach((field: any) => {
    formData.append("consulting_feild_ids[]", field.key.toString());
  });
  }
  console.log("industryNodes",this.industryNodes);
  if(this.industryNodes.length>0){
    this.industryNodes.forEach((industry: any) => {
    formData.append("industry_ids[]", industry.key.toString());
  });
  }

  if(this.otherConsultingNodes && this.otherConsultingNodes.length>0){
    this.otherConsultingNodes.forEach((field:any, index) => {
      formData.append(`suggest_consulting_fields[${index}][parent_id]`, field.parent.key ==="selectAll" ? 0 :field.parent.key);
      formData.append(`suggest_consulting_fields[${index}][name][en]`, field.data.customInput);
      formData.append(`suggest_consulting_fields[${index}][name][ar]`, field.data.customInput);
    });
  }
  
  if(this.otherIndustryNodes && this.otherIndustryNodes.length>0){
    this.otherIndustryNodes.forEach((field:any, index) => {
      formData.append(`suggest_industries[${index}][parent_id]`, field.parent.key ==="selectAll" ? 0 :field.parent.key);
      formData.append(`suggest_industries[${index}][name][en]`, field.data.customInput);
      formData.append(`suggest_industries[${index}][name][ar]`, field.data.customInput);
    });
  }

  const formDataEntries: Array<{ key: string; value: string }> = [];
  formData.forEach((value, key) => {
    formDataEntries.push({ key, value: value.toString() });
  });
  console.table(formDataEntries);
  return formData;
}


  submit() {
    if (this.registrationForm.valid  && this.selectedCountry
    ) {
      this.hasError = false;
      const emailControl = this.registrationForm.get('email');
const email = emailControl?.value;
      const user= this.prepareFormData();
      const registerAPI = this._register.preRegisterUser(user).pipe(first()).subscribe({
        next: (res) => {
          if (res.state) {
            this.registrationForm.reset();
            this.router.navigate(['/auth/verify-email', email]);
          }
        },
        error: (error) => {
          this.messages = [];
          if (error.validationMessages) {
            this.messages = error.validationMessages;
          } else {
            this.messages.push({ severity: 'error', summary: 'Error', detail: 'An unexpected error occurred.' });
          }
        },
      });
      this.unsubscribe.push(registerAPI);
    } else {
      this.hasError = true;
    }
  }

  togglePasswordVisibility(field: string): void {
    if (field === 'password') {
      this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
    } else if (field === 'confirmPassword') {
      this.confirmPasswordFieldType = this.confirmPasswordFieldType === 'password' ? 'text' : 'password';
    }
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
