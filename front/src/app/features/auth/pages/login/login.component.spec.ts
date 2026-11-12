import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { Login } from './login.component';
describe('Login', () => {
  const login = vi.fn();
  beforeEach(() => {
    login.mockReset();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: { login } }],
    });
  });
  it('does not send empty or malformed credentials', async () => {
    const component = TestBed.createComponent(Login).componentInstance;
    await component.submit();
    component.form.setValue({ email: 'incorrect', password: 'test' });
    await component.submit();
    expect(login).not.toHaveBeenCalled();
    expect(component.form.touched).toBe(true);
  });
  it('surfaces server errors and allows another attempt', async () => {
    login.mockReturnValue(throwError(() => ({ message: 'Credenciales incorrectas.' })));
    const component = TestBed.createComponent(Login).componentInstance;
    component.form.setValue({ email: 'test@example.com', password: 'test' });
    await component.submit();
    expect(component.error()).toContain('Credenciales incorrectas');
    expect(component.loading()).toBe(false);
  });
});
