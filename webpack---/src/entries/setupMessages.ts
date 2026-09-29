import {
  CHILD_TO_PARENT_TYPE,
  ERROR_TYPE,
  PARENT_TO_CHILD_TYPE,
  READY_TYPE,
} from '../shared/constants';
import type {
  ChildTypes,
  ErrorMessageData,
  InboundMessageData,
  InputType,
  OutboundMessageData,
  OutputType,
  ReadyMessageData,
} from '../shared/types';
import {makeRequestID} from '../shared/ids';

export type SendFn<Type extends ChildTypes> = (arg1: OutputType<Type>) => void;
type ErrorFn = (error: Error) => void;
export type RequestFn<Type extends ChildTypes> = (
  arg1: OutputType<Type>,
) => Promise<InputType<Type>>;
type HandlerFn<Type extends ChildTypes> = (
  arg1: InputType<Type>,
  arg2: SendFn<Type>,
) => unknown; // Allow for an async handler
export type SubscribeFn<Type extends ChildTypes> = (
  arg1: HandlerFn<Type>,
) => () => void;

export type MessageFunctions<Type extends ChildTypes> = {
  subscribe: SubscribeFn<Type>;
  send: SendFn<Type>;
  request: RequestFn<Type>;
};

// todo dish/bender: Determine what this allowlist should look like.
export const isValidOrigin = (origin: string) => {
  return (
    // We allow localhost and stripe.me for local/devbox ergonomics even
    // in production, but you should still ensure you verify changes with
    // tests/storybook before deploying to prod.
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.match(/.+\.stripe\.me(?::\d+)?$/) !== null ||
    origin.endsWith('.stripe.com') ||
    origin.endsWith('.link.co') ||
    origin.endsWith('.link.com') ||
    origin.endsWith('.onelink.com') ||
    origin === 'https://stripe.com' ||
    origin === 'https://link.co' ||
    origin === 'https://link.com' ||
    origin === 'https://onelink.com'
  );
};

export const setupMessages = <Type extends ChildTypes>(
  frameID: string,
  origin: string,
  allowNonStripeDomains: boolean,
): MessageFunctions<Type> & {
  sendError: ErrorFn;
} => {
  if (!allowNonStripeDomains && !isValidOrigin(origin)) {
    throw new Error('Invalid origin passed to thirdparty frame');
  }

  const send = (payload: OutputType<Type>, requestID: string | null = null) => {
    const message: OutboundMessageData<Type> = {
      type: CHILD_TO_PARENT_TYPE,
      frameID,
      payload,
      requestID,
    };
    window.parent.postMessage(message, origin);
  };

  const sendReadyMessage = () => {
    const message: ReadyMessageData = {
      type: READY_TYPE,
      frameID,
    };
    window.parent.postMessage(message, origin);
  };

  const sendError = (error: Error) => {
    const message: ErrorMessageData = {
      type: ERROR_TYPE,
      frameID,
      error,
    };
    window.parent.postMessage(message, origin);
  };

  const resolutions: {
    [key: string]: (arg1: InputType<Type>) => void;
  } = {};

  const inboundMessage = (
    event: MessageEvent,
  ): InboundMessageData<Type> | null | undefined => {
    const {data, origin: eventOrigin} = event;
    return eventOrigin === origin &&
      !!data &&
      typeof data === 'object' &&
      data.type === PARENT_TO_CHILD_TYPE &&
      data.frameID === frameID
      ? (data as any)
      : null;
  };

  const handleRequest = (event: MessageEvent) => {
    const data = inboundMessage(event);
    if (data) {
      const {requestID, payload} = data;
      const callback = typeof requestID === 'string' && resolutions[requestID];
      if (callback) {
        callback(payload);
      }
    }
  };

  const request = (payload: OutputType<Type>) => {
    if (Object.keys(resolutions).length === 0) {
      const target: EventTarget = window;
      target.addEventListener('message', handleRequest as (e: Event) => void);
    }
    return new Promise((resolve: (result: Promise<never>) => void) => {
      const requestID = makeRequestID();
      resolutions[requestID] = (input: InputType<Type>) => {
        // @ts-expect-error - TS2345 - Argument of type 'AddressAutocompleteInboundPayload | AuthMapInboundPayload | DynamicMapPayload | GoogleAnalyticsInboundPayload | ... 10 more ...' is not assignable to parameter of type 'Promise<never>'.
        resolve(input);
        delete resolutions[requestID];
        if (Object.keys(resolutions).length === 0) {
          const target: EventTarget = window;
          target.removeEventListener(
            'message',
            handleRequest as (e: Event) => void,
          );
        }
      };
      send(payload, requestID);
    });
  };

  const subscribe = (handler: HandlerFn<Type>) => {
    const onMessage = (event: MessageEvent) => {
      const data = inboundMessage(event);
      if (data) {
        const {requestID, payload} = data;
        if (!(typeof requestID === 'string' && resolutions[requestID])) {
          handler(payload, (outbound) => send(outbound, requestID));
        }
      }
    };

    const target = window as EventTarget;
    target.addEventListener('message', onMessage as (e: Event) => void);
    sendReadyMessage();

    return () => {
      target.removeEventListener('message', onMessage as (e: Event) => void);
    };
  };

  return {
    subscribe,
    send: (payload) => send(payload, null),
    request,
    sendError,
  };
};
