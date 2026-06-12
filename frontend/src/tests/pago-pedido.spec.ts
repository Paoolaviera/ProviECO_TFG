import { ComponentFixture, TestBed } from '@angular/core/testing';  
  
import { provideRouter } from '@angular/router';  
import { provideHttpClient } from '@angular/common/http';  
import { PagoPedidoComponent } from '../app/pago-pedido/pago-pedido';  
  
describe('PagoPedidoComponent', () => {  
  let component: PagoPedidoComponent;  
  let fixture: ComponentFixture<PagoPedidoComponent>;  
  
  beforeEach(async () => {  
    await TestBed.configureTestingModule({  
      imports: [PagoPedidoComponent],  
      providers: [  
        provideRouter([]),  
        provideHttpClient()  
      ]  
    }).compileComponents();  
  
    fixture = TestBed.createComponent(PagoPedidoComponent);  
    component = fixture.componentInstance;  
    await fixture.whenStable();  
  });  
  
  it('should create', () => {  
    expect(component).toBeTruthy();  
  });  
}); 
