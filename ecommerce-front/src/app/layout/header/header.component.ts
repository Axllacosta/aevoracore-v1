import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { AnnouncementBar } from '../announcement-bar/announcement-bar.component';
import { Navigation } from '../navigation/navigation.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, filter, map, startWith } from 'rxjs';
import { CategoryCatalogService } from '../../core/services/category-catalog.service';
import { VoiceNavigationService } from '../../core/services/voice-navigation.service';

@Component({
  imports: [RouterLink, AnnouncementBar, Navigation],
  selector: 'app-header',
  styleUrl: './header.component.scss',
  templateUrl: './header.component.html',
})
export class Header implements OnInit {
  readonly catalog = inject(CategoryCatalogService);
  readonly voice = inject(VoiceNavigationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly voiceDialog = viewChild<ElementRef<HTMLDialogElement>>('voiceDialog');

  constructor() {
    let completed = this.voice.completed();
    effect(() => {
      const next = this.voice.completed();
      const dialog = this.voiceDialog()?.nativeElement;
      if (next !== completed && dialog?.open) dialog.close();
      completed = next;
    });
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.voice.cancel());
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        map(() => this.router.parseUrl(this.router.url).queryParams['search'] ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((search) => {
        this.searchTerm.set(search);
      });
  }

  protected onSearchInput(event: Event): void {
    this.voice.cancel();
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  readonly cartCount = input(0);

  readonly search = output<string>();
  readonly cartClick = output<void>();

  protected readonly searchTerm = signal('');

  protected openVoice(dialog: HTMLDialogElement): void {
    dialog.showModal();
    this.voice.start();
  }

  protected closeVoice(dialog: HTMLDialogElement): void {
    this.voice.cancel();
    dialog.close();
  }

  protected editVoiceSearch(): void {
    this.searchTerm.set(this.voice.searchTerm() || this.voice.transcript() || this.searchTerm());
    this.voice.cancel();
    this.voice.transcript.set('');
  }

  protected submitSearch(value: string): void {
    this.voice.cancel();
    const search = value.trim();
    this.searchTerm.set(search);
    this.search.emit(search);
  }
}
