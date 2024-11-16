import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

export const routes: Routes = [
{
  path: '',
  redirectTo : 'auth',
  pathMatch:"full"
},
{
  path: 'auth',
  loadChildren: () =>
    import('./modules/auth/auth.module').then((m) => m.AuthModule),
},

{
  path: 'error',
  loadChildren: () =>
    import('./modules/errors/errors.module').then((m) => m.ErrorsModule),
},
{ path: '**', redirectTo: 'auth' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

