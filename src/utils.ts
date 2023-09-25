import { AssertEqual } from './type-utils';

export const assertEqualType = <A, B>(val: AssertEqual<A, B>) => val;
export const assertIs = <T>(val: T) => val;
