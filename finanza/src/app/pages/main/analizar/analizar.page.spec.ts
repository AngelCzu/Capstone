import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalizarPage } from './analizar.page';

describe('AnalizarPage', () => {
  let component: AnalizarPage;
  let fixture: ComponentFixture<AnalizarPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalizarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
