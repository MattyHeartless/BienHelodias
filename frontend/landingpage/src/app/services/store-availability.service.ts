import { Injectable, signal } from '@angular/core';
import { StorefrontStoreDto } from '../core/models';

export interface StoreAvailability {
  isOpen: boolean;
  scheduleLabel: string | null;
}

@Injectable({ providedIn: 'root' })
export class StoreAvailabilityService {
  private static readonly TIME_ZONE = 'America/Mexico_City';
  private readonly now = signal(new Date());

  constructor() {
    window.setInterval(() => this.now.set(new Date()), 30_000);
  }

  getAvailability(store: StorefrontStoreDto | null): StoreAvailability {
    this.now();

    const openingTime = this.toMinutes(store?.openingTime);
    const closingTime = this.toMinutes(store?.closingTime);
    if (openingTime === null || closingTime === null || openingTime === closingTime) {
      return { isOpen: true, scheduleLabel: null };
    }

    const currentMinutes = this.getCurrentMinutes();
    const isOpen = openingTime < closingTime
      ? currentMinutes >= openingTime && currentMinutes < closingTime
      : currentMinutes >= openingTime || currentMinutes < closingTime;

    return {
      isOpen,
      scheduleLabel: `${this.formatTime(store!.openingTime!)} - ${this.formatTime(store!.closingTime!)}`
    };
  }

  private getCurrentMinutes(): number {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: StoreAvailabilityService.TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(this.now());
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);

    return hour * 60 + minute;
  }

  private toMinutes(value: string | null | undefined): number | null {
    if (!value) {
      return null;
    }

    const [hours, minutes] = value.split(':').map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    return hours * 60 + minutes;
  }

  private formatTime(value: string): string {
    return value.slice(0, 5);
  }
}
