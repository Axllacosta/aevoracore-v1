import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Footer } from './footer.component';

describe('Footer', () => {
  let component: Footer;
  let fixture: ComponentFixture<Footer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Footer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders the current year and catalog navigation', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.footer-bottom')?.textContent).toContain(
      String(new Date().getFullYear()),
    );
    expect(fixture.nativeElement.querySelector('a[href="/productos"]')).not.toBeNull();
  });
});
