import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-productores',
  imports: [CommonModule, RouterLink],
  templateUrl: './productores.html',
  styleUrl: './productores.css',
})
export class Productores {
  protected readonly features = [
    {
      title: 'Visibilidad y ventas',
      points: [
        'Publicamos tus productos en el catalogo y los destacamos por temporada y zona.',
        'Acceso a clientes que buscan calidad, cercania y sostenibilidad.',
      ],
    },
    {
      title: 'Comercio justo',
      points: [
        'Tu marcas el precio. Sin subastas ni presion por intermediarios.',
        'Nosotros aportamos plataforma, atencion al cliente y soporte.',
      ],
    },
    {
      title: 'Logistica clara',
      points: [
        'Trabajamos con puntos de recogida y entregas programadas segun area.',
        'Pedidos agrupados para que sea mas eficiente para ti.',
      ],
    },
    {
      title: 'Alta guiada',
      points: [
        'No necesitas crear cuenta de productor por tu cuenta.',
        'Nos contactas, validamos datos y te damos acceso al Panel de productor.',
      ],
    },
  ];
}
