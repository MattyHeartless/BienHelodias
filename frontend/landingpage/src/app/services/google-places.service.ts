import { Injectable } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { DeliveryAddressDraft } from '../core/models';
import { googleMapsConfig } from '../core/google-maps.config';

@Injectable({ providedIn: 'root' })
export class GooglePlacesService {
  private loadPromise: Promise<void> | null = null;

  loadPlacesLibrary(): Promise<void> {
    if (!googleMapsConfig.apiKey) {
      return Promise.reject(new Error('Google Maps API key is missing.'));
    }

    if (!this.loadPromise) {
      setOptions({
        key: googleMapsConfig.apiKey,
        language: googleMapsConfig.language,
        region: googleMapsConfig.region,
        v: 'weekly',
        authReferrerPolicy: 'origin'
      });

      this.loadPromise = importLibrary('places').then(() => undefined);
    }

    return this.loadPromise;
  }

  async createAddressAutocomplete(input: HTMLInputElement): Promise<any> {
    await this.loadPlacesLibrary();

    const googleMaps = (window as Window & { google?: any }).google;
    const autocompleteConstructor = googleMaps?.maps?.places?.Autocomplete;

    if (!autocompleteConstructor) {
      throw new Error('Google Places Autocomplete is unavailable.');
    }

    return new autocompleteConstructor(input, {
      componentRestrictions: { country: [googleMapsConfig.countryCode] },
      fields: ['formatted_address', 'geometry', 'place_id', 'name']
    });
  }

  addPlaceChangedListener(autocomplete: any, handler: () => void): { remove: () => void } {
    const googleMaps = (window as Window & { google?: any }).google;
    const eventApi = googleMaps?.maps?.event;

    if (!eventApi?.addListener) {
      throw new Error('Google Maps event API is unavailable.');
    }

    return eventApi.addListener(autocomplete, 'place_changed', handler);
  }

  extractAddressDraft(autocomplete: any): DeliveryAddressDraft | null {
    const place = autocomplete.getPlace?.();
    if (!place) {
      return null;
    }

    const latitude = typeof place.geometry?.location?.lat === 'function'
      ? place.geometry.location.lat()
      : null;
    const longitude = typeof place.geometry?.location?.lng === 'function'
      ? place.geometry.location.lng()
      : null;

    return {
      formattedAddress: place.formatted_address ?? place.name ?? '',
      placeId: place.place_id ?? null,
      latitude,
      longitude
    };
  }
}
