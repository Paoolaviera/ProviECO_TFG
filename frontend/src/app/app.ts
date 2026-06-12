import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './templates/header/header.component';
import { FooterComponent } from './templates/footer/footer.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('EcoMarket_Sprint1');

  constructor(private authService: AuthService) {
    // Siempre arrancamos sin sesión para evitar tokens expirados
    // que bloqueen la carga del catálogo.
    this.authService.silentLogout();
  }
}
