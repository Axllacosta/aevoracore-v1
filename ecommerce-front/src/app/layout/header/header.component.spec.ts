import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { CategoryCatalogService } from '../../core/services/category-catalog.service';
import { Header } from './header.component';
import { VoiceNavigationService } from '../../core/services/voice-navigation.service';

describe('Header', () => {
  it('submits trimmed searches, clears an empty search and follows the URL', async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([{ path: 'productos', children: [] }]),
        {
          provide: CategoryCatalogService,
          useValue: {
            categories: signal([{ id_categoria: 7, nombre: 'Hogar' }]),
            loading: signal(false),
            error: signal(false),
            load: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Header);
    const submit = vi.fn();
    fixture.componentInstance.search.subscribe(submit);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const input = element.querySelector('input')!;
    input.value = '  Hogar  ';
    input.dispatchEvent(new Event('input'));
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(submit).toHaveBeenLastCalledWith('Hogar');
    input.value = '';
    input.dispatchEvent(new Event('input'));
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(submit).toHaveBeenLastCalledWith('');
    await TestBed.inject(Router).navigateByUrl('/productos?search=estante');
    await fixture.whenStable();
    expect(input.value).toBe('estante');
    expect(element.querySelector('datalist option')?.getAttribute('value')).toBe('Hogar');

    const voice = TestBed.inject(VoiceNavigationService);
    const dialog = element.querySelector<HTMLDialogElement>('dialog')!;
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    });
    const start = vi.spyOn(voice, 'start').mockImplementation(() => voice.starting.set(true));
    element.querySelector<HTMLButtonElement>('.voice-button')!.click();
    await fixture.whenStable();
    expect(dialog.showModal).toHaveBeenCalled();
    expect(start).toHaveBeenCalled();
    expect(dialog.textContent).toContain('Esperando al micrófono');
    voice.transcript.set('abrir sección desconocida');
    voice.message.set('No reconocimos la orden.');
    await fixture.whenStable();
    expect(element.querySelector('#voice-feedback')?.textContent).toContain(
      'abrir sección desconocida',
    );
    const editButton = Array.from(
      element.querySelectorAll<HTMLButtonElement>('#voice-feedback button'),
    ).find((button) => button.textContent?.includes('Escribir o corregir'))!;
    editButton.click();
    await fixture.whenStable();
    expect(input.value).toBe('abrir sección desconocida');
    expect(dialog.close).toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
    dialog.showModal();
    voice.completed.update((value) => value + 1);
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
  });
});
