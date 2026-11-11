'use client';

import { useEffect } from 'react';

/**
 * Hardens the app against a known React 19 + browser-extension DOM race:
 * "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."
 *
 * Typical causes: password managers rewriting <input type="password">, Google Translate
 * wrapping text nodes. Event listeners alone do not stop Next.js error overlays because
 * the throw happens inside React's commit phase — so we also patch Node.prototype.
 */
export function DomErrorGuard() {
  useEffect(() => {
    const isBenignRemoveChild = (message: unknown) => {
      const text = typeof message === 'string' ? message : String(message ?? '');
      return (
        text.includes("Failed to execute 'removeChild' on 'Node'") ||
        text.includes('The node to be removed is not a child of this node') ||
        text.includes("Failed to execute 'insertBefore' on 'Node'")
      );
    };

    const proto = Node.prototype as Node & {
      __clubdeeDomPatched?: boolean;
    };

    if (!proto.__clubdeeDomPatched) {
      proto.__clubdeeDomPatched = true;

      const originalRemoveChild = proto.removeChild;
      proto.removeChild = function <T extends Node>(child: T): T {
        if (child.parentNode !== this) {
          if (child.parentNode) {
            return originalRemoveChild.call(child.parentNode, child) as T;
          }
          return child;
        }
        try {
          return originalRemoveChild.call(this, child) as T;
        } catch (error) {
          if (isBenignRemoveChild((error as Error)?.message)) {
            return child;
          }
          throw error;
        }
      };

      const originalInsertBefore = proto.insertBefore;
      proto.insertBefore = function <T extends Node>(
        newNode: T,
        referenceNode: Node | null
      ): T {
        try {
          return originalInsertBefore.call(this, newNode, referenceNode) as T;
        } catch (error) {
          if (isBenignRemoveChild((error as Error)?.message)) {
            if (newNode.parentNode === this) {
              return newNode;
            }
            return this.appendChild(newNode);
          }
          throw error;
        }
      };
    }

    const onError = (event: ErrorEvent) => {
      if (isBenignRemoveChild(event.message) || isBenignRemoveChild(event.error?.message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === 'string'
          ? reason
          : reason?.message ?? String(reason ?? '');
      if (isBenignRemoveChild(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection, true);
    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection, true);
    };
  }, []);

  return null;
}
