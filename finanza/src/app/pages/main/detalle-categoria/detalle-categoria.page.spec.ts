import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetalleCategoriaPage } from './detalle-categoria.page';

describe('DetalleCategoriaPage', () => {
  let component: DetalleCategoriaPage;
  let fixture: ComponentFixture<DetalleCategoriaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetalleCategoriaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
