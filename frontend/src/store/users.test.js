import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../common/axios", () => ({
  requestAxios: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("quasar", () => ({
  Notify: { create: vi.fn() },
}));

vi.mock("jwt-decode", () => ({
  default: vi.fn(),
}));

vi.mock("../common/notify", () => ({
  notifyErrorRequest: vi.fn(),
  notifySuccessRequest: vi.fn(),
}));

import { requestAxios } from "../common/axios";
import jwt_decode from "jwt-decode";
import { notifyErrorRequest, notifySuccessRequest } from "../common/notify";
import { setActivePinia, createPinia } from "pinia";
import { storeUser } from "./users.js";

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe("users.js — loginUser / logoutUser", () => {
  it("loginUser() exitoso debe guardar token, email, dateLogin y retornar true", async () => {
    requestAxios.post.mockResolvedValue({
      data: { token: "jwt-token-123", email: "admin@test.com" },
    });

    const store = storeUser();
    const result = await store.loginUser({
      email: "admin@test.com",
      password: "1234",
    });

    expect(result).toBe(true);
    expect(store.token).toBe("jwt-token-123");
    expect(store.email).toBe("admin@test.com");
    expect(store.dateLogin).toBeDefined();
    expect(notifySuccessRequest).toHaveBeenCalledWith("Logeado con éxito");
  });

  it("loginUser() fallido debe llamar notifyErrorRequest y retornar false", async () => {
    requestAxios.post.mockRejectedValue({
      response: { data: { msg: "Credenciales inválidas" } },
    });

    const store = storeUser();
    const result = await store.loginUser({
      email: "bad@test.com",
      password: "wrong",
    });

    expect(result).toBe(false);
    expect(store.token).toBe("");
    expect(notifyErrorRequest).toHaveBeenCalledWith("Credenciales inválidas");
  });

  it("logoutUser() debe limpiar token, email, dateLogin y newConsult", async () => {
    requestAxios.post.mockResolvedValue({
      data: { token: "jwt-token", email: "a@b.com" },
    });

    const store = storeUser();
    await store.loginUser({ email: "a@b.com", password: "123" });
    store.newConsult = { label: "123", value: "abc" };

    store.logoutUser();

    expect(store.token).toBe("");
    expect(store.email).toBe("");
    expect(store.dateLogin).toBe("");
    expect(store.newConsult).toBe("");
  });
});

describe("users.js — getRole / getSuper", () => {
  it("getRole() con token válido debe decodificar y retornar el rol", () => {
    jwt_decode.mockReturnValue({ rol: "ADMINISTRADOR", super: 1 });
    const store = storeUser();
    store.token = "fake-jwt";

    const role = store.getRole();

    expect(jwt_decode).toHaveBeenCalledWith("fake-jwt");
    expect(role).toBe("ADMINISTRADOR");
  });

  it("getRole() sin token debe retornar 'USER' por defecto", () => {
    const store = storeUser();
    store.token = "";

    const role = store.getRole();

    expect(role).toBe("USER");
    expect(jwt_decode).not.toHaveBeenCalled();
  });

  it("getSuper() con token válido debe retornar el campo super del JWT", () => {
    jwt_decode.mockReturnValue({ super: 1 });
    const store = storeUser();
    store.token = "fake-jwt";

    const result = store.getSuper();

    expect(result).toBe(1);
  });

  it("getSuper() sin token debe retornar 0 por defecto", () => {
    const store = storeUser();
    store.token = "";

    const result = store.getSuper();

    expect(result).toBe(0);
  });
});

describe("users.js — registerUser / updateUser", () => {
  it("registerUser() exitoso debe llamar POST /users/register y notificar éxito", async () => {
    requestAxios.post.mockResolvedValue({ data: { id: 10 } });

    const store = storeUser();
    const result = await store.registerUser({
      email: "new@test.com",
      password: "1234",
    });

    expect(requestAxios.post).toHaveBeenCalledWith(
      "/users/register",
      { email: "new@test.com", password: "1234" },
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(notifySuccessRequest).toHaveBeenCalledWith(
      "Usuario registrado correctamente"
    );
    expect(result).toEqual({ data: { id: 10 } });
  });

  it("registerUser() fallido debe mostrar errores con join", async () => {
    requestAxios.post.mockRejectedValue({
      response: { data: { errors: ["Email ya existe", "Rol inválido"] } },
    });

    const store = storeUser();
    await store.registerUser({ email: "dup@test.com" });

    expect(notifyErrorRequest).toHaveBeenCalledWith(
      "Email ya existe, Rol inválido"
    );
  });

  it("updateUser() exitoso debe llamar PUT /users/update/:id y notificar", async () => {
    requestAxios.put.mockResolvedValue({ data: { updated: true } });

    const store = storeUser();
    const result = await store.updateUser(5, { email: "updated@test.com" });

    expect(requestAxios.put).toHaveBeenCalledWith(
      "/users/update/5",
      { email: "updated@test.com" },
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(notifySuccessRequest).toHaveBeenCalledWith(
      "Usuario actualizado correctamente"
    );
    expect(result).toEqual({ data: { updated: true } });
  });

  it("updateUser() fallido debe mostrar errores con join", async () => {
    requestAxios.put.mockRejectedValue({
      response: { data: { errors: ["Usuario no encontrado"] } },
    });

    const store = storeUser();
    await store.updateUser(999, {});

    expect(notifyErrorRequest).toHaveBeenCalledWith("Usuario no encontrado");
  });
});

describe("users.js — inactiveUser / activeUser", () => {
  it("inactiveUser() exitoso debe llamar PUT /users/inactive/:id y notificar", async () => {
    requestAxios.put.mockResolvedValue({ data: { msg: "ok" } });

    const store = storeUser();
    await store.inactiveUser(3);

    expect(requestAxios.put).toHaveBeenCalledWith(
      "/users/inactive/3",
      null,
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(notifySuccessRequest).toHaveBeenCalledWith(
      "Usuario desactivado correctamente"
    );
  });

  it("inactiveUser() fallido debe mostrar errores", async () => {
    requestAxios.put.mockRejectedValue({
      response: { data: { errors: ["No se puede desactivar"] } },
    });

    const store = storeUser();
    await store.inactiveUser(1);

    expect(notifyErrorRequest).toHaveBeenCalledWith(
      "No se puede desactivar"
    );
  });

  it("activeUser() exitoso debe llamar PUT /users/active/:id y notificar", async () => {
    requestAxios.put.mockResolvedValue({ data: { msg: "ok" } });

    const store = storeUser();
    await store.activeUser(7);

    expect(requestAxios.put).toHaveBeenCalledWith(
      "/users/active/7",
      null,
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(notifySuccessRequest).toHaveBeenCalledWith(
      "Usuario activado correctamente"
    );
  });

  it("activeUser() fallido debe mostrar errores", async () => {
    requestAxios.put.mockRejectedValue({
      response: { data: { errors: ["Usuario ya activo"] } },
    });

    const store = storeUser();
    await store.activeUser(5);

    expect(notifyErrorRequest).toHaveBeenCalledWith("Usuario ya activo");
  });
});

describe("users.js — allUsers", () => {
  it("allUsers() exitoso debe retornar array de usuarios", async () => {
    const users = [
      { id: 1, email: "admin@test.com", rol: "ADMINISTRADOR" },
      { id: 2, email: "user@test.com", rol: "CONSULTOR" },
    ];
    requestAxios.get.mockResolvedValue({ data: users });

    const store = storeUser();
    const result = await store.allUsers();

    expect(requestAxios.get).toHaveBeenCalledWith(
      "/users",
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(result).toEqual(users);
  });

  it("allUsers() fallido debe retornar false y notificar error", async () => {
    requestAxios.get.mockRejectedValue({
      response: { data: { msg: "Token expirado" } },
    });

    const store = storeUser();
    const result = await store.allUsers();

    expect(result).toBe(false);
    expect(notifyErrorRequest).toHaveBeenCalledWith("Token expirado");
  });
});

describe("users.js — newConsult (migrado de Reports.js)", () => {
  it("newConsult debe ser un ref vacío por defecto", () => {
    const store = storeUser();
    expect(store.newConsult).toBe("");
  });

  it("newConsult debe ser escribible", () => {
    const store = storeUser();
    store.newConsult = { label: "12345", value: "abc123" };
    expect(store.newConsult).toEqual({ label: "12345", value: "abc123" });
  });
});
