import "@testing-library/jest-dom/vitest";
import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

// Add testing-library matchers to expect
expect.extend(matchers);
