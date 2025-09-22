import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { noAuthGuard } from './guards/no-auth-guard';
import { authGuard } from './guards/auth-guard';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule), canActivate:[noAuthGuard]
  },
  {
    path: 'sign-up',
    loadChildren: () => import('./pages/sign-up/sign-up.module').then( m => m.SignUpPageModule), canActivate:[noAuthGuard]
  },
  {
    path: 'forgot-password',
    loadChildren: () => import('./pages/forgot-password/forgot-password.module').then( m => m.ForgotPasswordPageModule), canActivate:[noAuthGuard]
  },
  {
    path: 'profile',
    loadChildren: () => import('./pages/main/profile/profile.module').then( m => m.ProfilePageModule), canActivate:[noAuthGuard]
  },
  {
    path: 'main',
    loadChildren: () => import('./pages/main/main.module').then( m => m.MainPageModule),canActivate:[authGuard]
  },
  {
    path: 'agregar',
    loadChildren: () => import('./pages/main/agregar/agregar.module').then( m => m.AgregarPageModule),canActivate:[authGuard]
  },
  {
    path: 'menu',
    loadChildren: () => import('./pages/main/menu/menu.module').then( m => m.MenuPageModule),canActivate:[authGuard]
  },
  {
    path: 'test',
    loadChildren: () => import('./pages/main/test/test.module').then( m => m.TestPageModule)
  },


];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
