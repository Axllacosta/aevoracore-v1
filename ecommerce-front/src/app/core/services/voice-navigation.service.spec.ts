import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { CategoryCatalogService } from './category-catalog.service';
import { VoiceNavigationService, parseVoiceCommand } from './voice-navigation.service';

class FakeRecognition {
  static instance: FakeRecognition;
  lang = '';
  continuous = true;
  interimResults = true;
  onresult: any;
  onerror: any;
  onend: any;
  onstart: any;
  onaudiostart: any;
  onspeechstart: any;
  onnomatch: any;
  start = vi.fn();
  abort = vi.fn();
  constructor() {
    FakeRecognition.instance = this;
  }
}

describe('Voice navigation', () => {
  let voice: VoiceNavigationService;
  let navigate: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('webkitSpeechRecognition', FakeRecognition);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CategoryCatalogService,
          useValue: {
            categories: signal([{ id_categoria: 7, nombre: 'Hogar' }]),
            error: signal(false),
            load: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    });
    voice = TestBed.inject(VoiceNavigationService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => {
    voice.ngOnDestroy();
    vi.unstubAllGlobals();
  });

  it('only permits navigation commands and preserves the search text', () => {
    expect(parseVoiceCommand('¡Ir al inicio!')).toEqual({ kind: 'route', path: '/' });
    expect(parseVoiceCommand('Buscar mesas de Perú')).toEqual({
      kind: 'search',
      term: 'mesas de Perú',
    });
    expect(parseVoiceCommand('abrir categoría Hogar')).toEqual({ kind: 'category', name: 'hogar' });
    expect(parseVoiceCommand('cocina')).toEqual({ kind: 'search', term: 'cocina' });
    expect(parseVoiceCommand('muebles de Perú')).toEqual({
      kind: 'search',
      term: 'muebles de Perú',
    });
    expect(parseVoiceCommand('   ')).toEqual({ kind: 'unknown' });
  });

  it('listens in es-PE and executes the final result once', () => {
    voice.start();
    const recognition = FakeRecognition.instance;
    expect(recognition.lang).toBe('es-PE');
    expect(recognition.interimResults).toBe(true);
    expect(voice.starting()).toBe(true);
    expect(voice.listening()).toBe(false);
    recognition.onstart();
    expect(voice.listening()).toBe(true);
    recognition.onresult({
      results: [{ isFinal: true, 0: { transcript: 'Buscar mesas de madera' } }],
    });
    expect(voice.transcript()).toBe('Buscar mesas de madera');
    expect(voice.listening()).toBe(false);
    expect(recognition.abort).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/productos'], {
      queryParams: { search: 'mesas de madera', category_id: null },
    });
    expect(recognition.onresult).toBeNull();
  });

  it('shows partial transcripts without navigating, then replaces them with the final phrase', () => {
    voice.start();
    const recognition = FakeRecognition.instance;
    recognition.onstart();
    recognition.onaudiostart();
    recognition.onspeechstart();
    expect(voice.capturing()).toBe(true);
    expect(voice.speechDetected()).toBe(true);
    recognition.onresult({ results: [{ isFinal: false, 0: { transcript: 'buscar mes' } }] });
    expect(voice.transcript()).toBe('buscar mes');
    expect(navigate).not.toHaveBeenCalled();
    recognition.onresult({ results: [{ isFinal: true, 0: { transcript: 'buscar mesas' } }] });
    expect(voice.transcript()).toBe('buscar mesas');
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(voice.capturing()).toBe(false);
  });

  it('preserves partial text if Chrome ends without a final result', () => {
    voice.start();
    const recognition = FakeRecognition.instance;
    recognition.onresult({ results: [{ isFinal: false, 0: { transcript: 'buscar madera' } }] });
    recognition.onend();
    expect(voice.transcript()).toBe('buscar madera');
    expect(voice.message()).toContain('sin una frase definitiva');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('cleans up audio event handlers when cancelled', () => {
    voice.start();
    const recognition = FakeRecognition.instance;
    voice.cancel();
    expect(recognition.onstart).toBeNull();
    expect(recognition.onspeechstart).toBeNull();
    expect(voice.starting()).toBe(false);
  });

  it.each(['not-allowed', 'audio-capture', 'no-speech', 'network', 'language-not-supported'])(
    'handles %s without navigating',
    (error) => {
      voice.start();
      FakeRecognition.instance.onerror({ error });
      expect(voice.listening()).toBe(false);
      expect(voice.message()).not.toContain('Escuchando');
      expect(voice.message()).not.toBe('');
      expect(navigate).not.toHaveBeenCalled();
    },
  );

  it('can cancel listening and ignores an empty phrase', async () => {
    voice.start();
    voice.start();
    expect(voice.listening()).toBe(false);
    await voice.execute('   ');
    expect(navigate).not.toHaveBeenCalled();
    expect(voice.message()).toContain('No recibimos');
  });

  it('searches a direct phrase and signals completion after navigation', async () => {
    await voice.execute('cocina');
    expect(navigate).toHaveBeenCalledWith(['/productos'], {
      queryParams: { search: 'cocina', category_id: null },
    });
    expect(voice.searchTerm()).toBe('cocina');
    expect(voice.completed()).toBe(1);
  });

  it('keeps the dialog available if navigation fails', async () => {
    navigate.mockResolvedValue(false);
    await voice.execute('muebles');
    expect(voice.completed()).toBe(0);
    expect(voice.message()).toContain('No pudimos abrir');
  });

  it('resolves categories using their real catalog id', async () => {
    await voice.execute('abrir categoría Hogar');
    expect(navigate).toHaveBeenCalledWith(['/productos'], { queryParams: { category_id: 7 } });
  });

  it('handles missing browser support and insecure contexts', () => {
    vi.stubGlobal('isSecureContext', false);
    voice.start();
    expect(voice.message()).toContain('HTTPS o localhost');
    vi.stubGlobal('webkitSpeechRecognition', undefined);
    vi.stubGlobal('SpeechRecognition', undefined);
    voice.start();
    expect(voice.message()).toContain('no está disponible');
  });
});
