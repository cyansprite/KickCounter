import { Routes } from '@angular/router';
import { MainComponent } from './main/main.component';

export const routes: Routes = [
    { path: '**', redirectTo: "main" },
    {
        path: 'main', component: MainComponent,
    },
];
