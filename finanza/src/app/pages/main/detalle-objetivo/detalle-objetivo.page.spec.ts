import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetalleObjetivoPage } from './detalle-objetivo.page';

describe('DetalleObjetivoPage', () => {
  let component: DetalleObjetivoPage;
  let fixture: ComponentFixture<DetalleObjetivoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetalleObjetivoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
