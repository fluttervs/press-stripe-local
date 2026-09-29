import {setTag} from '@sentry/browser';

import {initializeSentry} from './initializeSentry';
import type {MessageFunctions} from './setupMessages';
import {setupMessages} from './setupMessages';
import {ChildTypes} from '../shared/types';

export type AppConfig<Type extends ChildTypes> = MessageFunctions<Type> & {
  root: HTMLElement;
};

export type InitConfig<Type extends ChildTypes> = {
  owner: string;
  app: (config: AppConfig<Type>) => unknown;
};

export const ROOT_ID = 'root';

export const initialize = <Type extends ChildTypes>(
  config: InitConfig<Type>,
) => {
  initializeSentry();

  const {app, owner} = config;
  setTag('owner', owner);
  const {body, location} = document;
  const params = new URLSearchParams(location.search.slice(1));
  const frameID = params.get('id');
  const origin = params.get('origin');

  if (body && frameID && origin) {
    setTag('origin', origin);
    const root =
      document.getElementById(ROOT_ID) || document.createElement('div');
    root.setAttribute('id', ROOT_ID);
    body.appendChild(root);
    const allowNonStripeDomains = location.pathname.endsWith('/RLogger.html');
    const {sendError, ...messageFunctions} = setupMessages(
      frameID,
      origin,
      allowNonStripeDomains,
    );
    window.onerror = (
      message: any,
      src: any,
      lineno: any,
      colno: any,
      error: any,
    ) => {
      sendError(error || new Error(message));
    };
    // @ts-expect-error - TS2345 - Argument of type '{ subscribe: SubscribeFn<keyof ChildDataTypes>; send: SendFn<keyof ChildDataTypes>; request: RequestFn<keyof ChildDataTypes>; root: HTMLElement; }' is not assignable to parameter of type 'AppConfig<Type>'.
    app({root, ...messageFunctions});
  }
};
