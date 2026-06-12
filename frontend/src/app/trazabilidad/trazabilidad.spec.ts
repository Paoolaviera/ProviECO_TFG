import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { TrazabilidadComponent } from './trazabilidad';

describe('Trazabilidad', () => {
  let component: TrazabilidadComponent;
  let fixture: ComponentFixture<TrazabilidadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrazabilidadComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => null,
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrazabilidadComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
