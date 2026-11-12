import { Component, OnDestroy, OnInit, signal } from '@angular/core';

interface HeroBannerSlide {
  src: string;
  alt: string;
}

const HERO_BANNERS: HeroBannerSlide[] = [
  { src: '/assets/images/banners/hero-01.png', alt: 'Anuncio promocional EDITH 1' },
  { src: '/assets/images/banners/hero-02.png', alt: 'Anuncio promocional EDITH 2' },
];

@Component({
  imports: [],
  selector: 'app-hero-banner',
  styleUrl: './hero-banner.component.scss',
  templateUrl: './hero-banner.component.html',
})
export class HeroBanner implements OnInit, OnDestroy {
  readonly slides = HERO_BANNERS;
  readonly activeSlide = signal(0);
  readonly failedSlides = signal(new Set<number>());

  private carouselTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.carouselTimer = setInterval(() => this.nextSlide(), 6000);
  }

  ngOnDestroy(): void {
    if (this.carouselTimer) clearInterval(this.carouselTimer);
  }

  nextSlide(): void {
    const available = this.slides
      .map((_, index) => index)
      .filter((index) => !this.failedSlides().has(index));

    if (available.length < 2) return;

    const currentPosition = available.indexOf(this.activeSlide());
    const nextPosition = (currentPosition + 1) % available.length;
    this.activeSlide.set(available[nextPosition]);
  }

  selectSlide(index: number): void {
    if (index >= 0 && index < this.slides.length && !this.failedSlides().has(index)) {
      this.activeSlide.set(index);
    }
  }

  onImageError(): void {
    const failed = new Set(this.failedSlides());
    failed.add(this.activeSlide());
    this.failedSlides.set(failed);
    this.nextSlide();
  }
}
