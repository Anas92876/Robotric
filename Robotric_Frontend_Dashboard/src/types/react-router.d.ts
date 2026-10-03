import 'react-router';

declare module 'react-router' {
  export function useMatch(path: string): any;
}
