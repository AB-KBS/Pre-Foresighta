import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultingFieldTreeComponent } from './consulting-field-tree.component';

describe('ConsultingFieldTreeComponent', () => {
  let component: ConsultingFieldTreeComponent;
  let fixture: ComponentFixture<ConsultingFieldTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultingFieldTreeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ConsultingFieldTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
