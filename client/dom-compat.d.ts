export {};

declare global {
  interface Element {
    inert: boolean;
    hidden: boolean;
    dataset: DOMStringMap;
    style: CSSStyleDeclaration;
    value: string;
    checked: boolean;
    disabled: boolean;
    href: string;
    src: string;
    alt: string;
    onload: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    onerror: OnErrorEventHandler;
    showModal(): void;
    close(returnValue?: string): void;
    returnValue: string;
    focus(options?: FocusOptions): void;
    click(): void;
  }

  interface EventTarget {
    querySelector<E extends Element = Element>(selectors: string): E | null;
    closest<E extends Element = Element>(selectors: string): E | null;
    disabled: boolean;
    textContent: string | null;
  }
  const __APP_VERSION__: string;
}

