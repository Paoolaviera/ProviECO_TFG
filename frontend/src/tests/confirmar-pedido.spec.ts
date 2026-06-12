import { ComponentFixture, TestBed } from '@angular/core/testing';  
  
import { provideRouter } from '@angular/router';  
import { provideHttpClient } from '@angular/common/http';  
import { ConfirmarPedidoComponent } from '../app/confirmar-pedido/confirmar-pedido';  
  
describe('ConfirmarPedidoComponent', () => {  
  let component: ConfirmarPedidoComponent;  
  let fixture: ComponentFixture<ConfirmarPedidoComponent>;  
  
  beforeEach(async () => {  
    await TestBed.configureTestingModule({  
      imports: [ConfirmarPedidoComponent],  
      providers: [  
        provideRouter([]),  
        provideHttpClient()  
      ]  
    }).compileComponents();  
  
    fixture = TestBed.createComponent(ConfirmarPedidoComponent);  
    component = fixture.componentInstance;  
    await fixture.whenStable();  
  });  
  
  it('should create', () => {  
    expect(component).toBeTruthy();  
  });  
}); 
