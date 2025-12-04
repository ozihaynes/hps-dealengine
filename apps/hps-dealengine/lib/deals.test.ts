import { describe, expect, it } from "vitest";
import {
  buildDealPayload,
  extractContactFromDeal,
  extractContactFromPayload,
  formatAddressLine,
  createEmptyDealForm,
  normalizeContact,
} from "./deals";

describe("deals helpers", () => {
  it("normalizes contact by trimming and dropping empties", () => {
    expect(
      normalizeContact({
        name: "  Jane Seller ",
        phone: " ",
        email: "seller@example.com ",
      }),
    ).toEqual({
      name: "Jane Seller",
      email: "seller@example.com",
    });

    expect(normalizeContact({ name: " ", phone: " ", email: " " })).toBeNull();
  });

  it("builds payload with contact and property location", () => {
    const payload = buildDealPayload({
      basePayload: { existing: true },
      contact: { name: "Alex", phone: "555-1234", email: "a@b.com" },
      address: {
        address: "123 Main St",
        city: "Orlando",
        state: "FL",
        zip: "32801",
      },
    });

    expect(payload).toEqual({
      existing: true,
      contact: { name: "Alex", phone: "555-1234", email: "a@b.com" },
      client: { name: "Alex", phone: "555-1234", email: "a@b.com" },
      property: {
        address: "123 Main St",
        city: "Orlando",
        state: "FL",
        zip: "32801",
      },
    });
  });

  it("extracts contact info from a DbDeal payload", () => {
    const contact = extractContactFromDeal({
      id: "1",
      org_id: "org",
      orgId: "org",
      orgName: null,
      client_name: null,
      client_phone: null,
      client_email: null,
      created_by: "user",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      address: "addr",
      city: null,
      state: null,
      zip: null,
      payload: {
        client: { name: "Buyer", phone: "555", email: "buyer@example.com" },
      },
    });

    expect(contact).toEqual({
      name: "Buyer",
      phone: "555",
      email: "buyer@example.com",
    });
  });

  it("extracts contact info from deal columns when payload is empty", () => {
    const contact = extractContactFromDeal({
      id: "2",
      org_id: "org",
      orgId: "org",
      orgName: null,
      client_name: "Column Contact",
      client_phone: "123-4567",
      client_email: "col@example.com",
      created_by: "user",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      address: "addr",
      city: null,
      state: null,
      zip: null,
      payload: {},
    });

    expect(contact).toEqual({
      name: "Column Contact",
      phone: "123-4567",
      email: "col@example.com",
    });
  });

  it("extracts contact info from a payload-only object", () => {
    const contact = extractContactFromPayload({
      contact: { name: "Seller", phone: "321-0000", email: "seller@home.com" },
    });

    expect(contact).toEqual({
      name: "Seller",
      phone: "321-0000",
      email: "seller@home.com",
    });
  });

  it("formats an address line from parts", () => {
    expect(
      formatAddressLine({
        address: "123 Main",
        city: "Orlando",
        state: "FL",
        zip: "32801",
      }),
    ).toBe("123 Main, Orlando, FL, 32801");

    expect(
      formatAddressLine({
        address: "",
        city: "Orlando",
        state: "",
        zip: "",
      }),
    ).toBe("Orlando");
  });

  it("exposes a blank new-deal form shape with no demo defaults", () => {
    const form = createEmptyDealForm();
    expect(form).toEqual({
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      propertyStreet: "",
      propertyCity: "",
      propertyState: "",
      propertyPostalCode: "",
    });
  });
});
