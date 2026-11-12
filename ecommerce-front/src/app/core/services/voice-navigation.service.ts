import { Injectable, NgZone, OnDestroy, inject, signal } from '@angular/core';
import { Router, type Params } from '@angular/router';
import { CategoryCatalogService } from './category-catalog.service';
import type { PublicCategory } from '../models/public-category.model';

export function normalizeVoiceText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[¿?¡!.,;:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export type VoiceCommand =
  | { kind: 'route'; path: string }
  | { kind: 'search'; term: string }
  | { kind: 'category'; name: string }
  | { kind: 'unknown' };

export function parseVoiceCommand(text: string): VoiceCommand {
  const phrase = normalizeVoiceText(text);
  const route = /^(?:ir (?:a |al )|abrir |ver |mostrar )?(inicio|productos|catalogo|carrito)$/.exec(
    phrase,
  );
  if (route)
    return {
      kind: 'route',
      path: route[1] === 'inicio' ? '/' : route[1] === 'carrito' ? '/carrito' : '/productos',
    };
  const category =
    /^(?:ir a (?:la )?|abrir (?:la )?|ver (?:la )?|mostrar (?:la )?)categoria (.+)$/.exec(phrase);
  if (category) return { kind: 'category', name: category[1] };

  const search = /^(?:buscar|busca|buscame)\s+(.+)$/i.exec(text.trim());
  if (search?.[1].trim())
    return {
      kind: 'search',
      term: search[1]
        .trim()
        .replace(/[.!?]+$/, '')
        .slice(0, 160),
    };
  const term = text
    .trim()
    .replace(/[.!?]+$/, '')
    .trim()
    .slice(0, 160);
  return term ? { kind: 'search', term } : { kind: 'unknown' };
}

export function matchingCategories(text: string, categories: PublicCategory[]): PublicCategory[] {
  const phrase = normalizeVoiceText(text);
  return categories.filter((category) => {
    const name = normalizeVoiceText(category.nombre);
    return !!name && (` ${phrase} `.includes(` ${name} `) || phrase === name);
  });
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onnomatch: (() => void) | null;
  onresult:
    | ((event: {
        results: ArrayLike<{ isFinal: boolean; [index: number]: { transcript: string } }>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;

@Injectable({ providedIn: 'root' })
export class VoiceNavigationService implements OnDestroy {
  private readonly router = inject(Router);
  private readonly catalog = inject(CategoryCatalogService);
  private readonly zone = inject(NgZone);
  private recognition?: Recognition;
  private timeout?: ReturnType<typeof setTimeout>;
  private revision = 0;
  readonly listening = signal(false);
  readonly starting = signal(false);
  readonly capturing = signal(false);
  readonly speechDetected = signal(false);
  readonly transcript = signal('');
  readonly message = signal('');
  readonly choices = signal<PublicCategory[]>([]);
  readonly searchTerm = signal('');
  readonly completed = signal(0);

  private get constructorApi(): RecognitionConstructor | undefined {
    if (typeof window === 'undefined') return undefined;
    const browser = window as unknown as {
      SpeechRecognition?: RecognitionConstructor;
      webkitSpeechRecognition?: RecognitionConstructor;
    };
    return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  }

  start(): void {
    if (this.listening() || this.starting()) {
      this.cancel();
      return;
    }
    this.cancel();
    this.transcript.set('');
    this.searchTerm.set('');
    const Api = this.constructorApi;
    if (!Api) {
      this.message.set(
        'La voz no está disponible en este navegador. Usa Chrome o escribe tu búsqueda.',
      );
      return;
    }
    if (!window.isSecureContext) {
      this.message.set(
        'Para usar el micrófono abre el sitio con HTTPS o localhost. Puedes escribir tu búsqueda.',
      );
      return;
    }
    const recognition = (this.recognition = new Api());
    recognition.lang = 'es-PE';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () =>
      this.zone.run(() => {
        this.starting.set(false);
        this.listening.set(true);
        this.message.set('Escuchando… Habla ahora.');
        this.armTimeout(20000);
      });
    recognition.onaudiostart = () => this.zone.run(() => this.capturing.set(true));
    recognition.onspeechstart = () =>
      this.zone.run(() => {
        this.speechDetected.set(true);
        this.message.set('Voz detectada. Estamos reconociendo tu frase…');
        this.armTimeout(20000);
      });
    recognition.onnomatch = () =>
      this.zone.run(() => {
        this.message.set(
          'Detectamos sonido, pero no pudimos entender la frase. Inténtalo otra vez.',
        );
        this.release();
      });
    recognition.onresult = (event) =>
      this.zone.run(() => {
        const results = Array.from(event.results);
        const text = results
          .map((result) => result[0]?.transcript ?? '')
          .join(' ')
          .trim();
        this.transcript.set(text);
        if (!results.length || !results.every((result) => result.isFinal)) {
          this.message.set('Reconociendo tu frase…');
          return;
        }
        this.release();
        if (text) void this.execute(text);
        else this.message.set('No pudimos reconocer lo que dijiste. Vuelve a intentar o escribe.');
      });
    recognition.onerror = (event) =>
      this.zone.run(() => {
        const messages: Record<string, string> = {
          'not-allowed':
            'No tenemos acceso al micrófono. Revisa los permisos del sitio en Chrome y los del sistema, o escribe tu búsqueda.',
          'service-not-allowed':
            'El servicio de voz está bloqueado. Revisa los permisos o escribe tu búsqueda.',
          'audio-capture':
            'No encontramos un micrófono disponible. Revisa su conexión o escribe tu búsqueda.',
          'no-speech': 'No escuchamos ninguna frase. Vuelve a intentar o escribe tu búsqueda.',
          network:
            'No pudimos conectar con el servicio de voz. Revisa tu conexión e inténtalo otra vez.',
          'language-not-supported':
            'El servicio no tiene disponible español de Perú. Puedes escribir tu búsqueda.',
        };
        this.message.set(
          messages[event.error] ??
            'No pudimos reconocer tu voz. Vuelve a intentar o escribe tu búsqueda.',
        );
        this.release();
      });
    recognition.onend = () =>
      this.zone.run(() => {
        this.message.set(
          this.transcript()
            ? 'La captura terminó sin una frase definitiva. Puedes corregir el texto o volver a intentar.'
            : 'La captura terminó sin reconocer una frase. Revisa el micrófono seleccionado en Chrome e inténtalo otra vez.',
        );
        this.release();
      });
    this.starting.set(true);
    this.message.set('Activando micrófono… Si Chrome solicita permiso, selecciona Permitir.');
    try {
      this.armTimeout(30000);
      recognition.start();
    } catch {
      this.message.set(
        'No pudimos activar el micrófono. Revisa los permisos o escribe tu búsqueda.',
      );
      this.release();
    }
  }

  private armTimeout(milliseconds: number): void {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(
      () =>
        this.zone.run(() => {
          this.message.set(
            this.starting()
              ? 'Chrome no pudo iniciar la escucha. Revisa el permiso y el micrófono seleccionado, y vuelve a intentar.'
              : 'No recibimos una frase definitiva. Puedes volver a intentar o corregir el texto.',
          );
          this.release();
        }),
      milliseconds,
    );
  }

  cancel(): void {
    ++this.revision;
    this.release();
    this.message.set('');
    this.choices.set([]);
  }

  private release(): void {
    clearTimeout(this.timeout);
    if (this.recognition) {
      this.recognition.onresult = this.recognition.onerror = this.recognition.onend = null;
      this.recognition.onstart =
        this.recognition.onaudiostart =
        this.recognition.onspeechstart =
        this.recognition.onnomatch =
          null;
      this.recognition.abort();
      this.recognition = undefined;
    }
    this.listening.set(false);
    this.starting.set(false);
    this.capturing.set(false);
    this.speechDetected.set(false);
  }

  async execute(text: string): Promise<void> {
    const revision = ++this.revision;
    const command = parseVoiceCommand(text);
    this.choices.set([]);
    if (command.kind === 'route') {
      this.message.set('Abriendo la sección solicitada.');
      await this.navigate(command.path);
    } else if (command.kind === 'search') {
      this.searchTerm.set(command.term);
      this.message.set(`Buscando: “${command.term}”. Puedes corregir el texto en el buscador.`);
      const current = this.router.parseUrl(this.router.url);
      await this.navigate('/productos', {
        search: command.term,
        category_id:
          current.root.children['primary']?.segments[0]?.path === 'productos'
            ? (current.queryParams['category_id'] ?? null)
            : null,
      });
    } else if (command.kind === 'category') {
      this.message.set('Buscando la categoría…');
      await this.catalog.load();
      if (revision !== this.revision) return;
      if (this.catalog.error()) {
        this.message.set('No pudimos cargar las categorías. Inténtalo otra vez.');
        return;
      }
      const exact = this.catalog
        .categories()
        .filter((c) => normalizeVoiceText(c.nombre) === command.name);
      const matches = exact.length
        ? exact
        : this.catalog.categories().filter((c) => {
            const name = normalizeVoiceText(c.nombre);
            return ` ${name} `.includes(` ${command.name} `);
          });
      if (matches.length === 1) await this.openCategory(matches[0]);
      else {
        this.choices.set(matches);
        this.message.set(
          matches.length
            ? '¿Qué categoría quieres abrir?'
            : 'No encontramos esa categoría. Prueba con otro nombre o busca un producto.',
        );
      }
    } else
      this.message.set(
        'No recibimos una frase. Di el producto que buscas, por ejemplo «cocina» o «muebles».',
      );
  }

  async openCategory(category: PublicCategory): Promise<void> {
    ++this.revision;
    this.choices.set([]);
    this.message.set(`Abriendo la categoría ${category.nombre}.`);
    await this.navigate('/productos', { category_id: category.id_categoria });
  }

  private async navigate(path: string, queryParams?: Params): Promise<void> {
    const revision = this.revision;
    try {
      const result = queryParams
        ? await this.router.navigate([path], { queryParams })
        : await this.router.navigate([path]);
      if (revision !== this.revision) return;
      const target = this.router.serializeUrl(this.router.createUrlTree([path], { queryParams }));
      if (result || target === this.router.url) this.completed.update((value) => value + 1);
      else this.message.set('No pudimos abrir los resultados. Inténtalo otra vez.');
    } catch {
      if (revision === this.revision)
        this.message.set('No pudimos abrir los resultados. Inténtalo otra vez.');
    }
  }

  ngOnDestroy(): void {
    this.cancel();
  }
}
