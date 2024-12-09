import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndustryTreeComponent } from './industry-tree.component';

describe('IndustryTreeComponent', () => {
  let component: IndustryTreeComponent;
  let fixture: ComponentFixture<IndustryTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndustryTreeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(IndustryTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
