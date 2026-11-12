import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnnouncementBar } from './announcement-bar.component';

describe('AnnouncementBar', () => {
  let component: AnnouncementBar;
  let fixture: ComponentFixture<AnnouncementBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementBar],
    }).compileComponents();

    fixture = TestBed.createComponent(AnnouncementBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
