import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ExporterController } from "./exporter.module";
import type { PrismaService } from "../prisma/prisma.service";

describe("Exporter controller tenant boundaries", () => {
  const actor = { user: { sub: "user-1" } };
  const db = {
    organizationMember: { findUnique: jest.fn() },
    exporterProfile: { findUnique: jest.fn() },
    exporterDirectory: { findMany: jest.fn() },
    exporterOrder: { findMany: jest.fn() },
    exporterAttachment: { findFirst: jest.fn() },
  };
  const controller = new ExporterController(db as unknown as PrismaService);
  beforeEach(() => jest.resetAllMocks());
  it("denies a non-member before reading exporter data", async () => {
    db.organizationMember.findUnique.mockResolvedValue(null);
    await expect(controller.workspace("org-2", actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(db.exporterOrder.findMany).not.toHaveBeenCalled();
  });
  it("scopes every workspace query to the authorized organization", async () => {
    db.organizationMember.findUnique.mockResolvedValue({ role: "OWNER" });
    db.exporterProfile.findUnique.mockResolvedValue(null);
    db.exporterDirectory.findMany.mockResolvedValue([]);
    db.exporterOrder.findMany.mockResolvedValue([]);
    expect(await controller.workspace("org-1", actor)).toEqual({
      profile: null,
      directory: [],
      orders: [],
    });
    expect(db.exporterOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-1" } }),
    );
    expect(db.exporterDirectory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-1" } }),
    );
  });
  it("never fetches an attachment without organization and order scope", async () => {
    db.organizationMember.findUnique.mockResolvedValue({ role: "ACCOUNTANT" });
    db.exporterAttachment.findFirst.mockResolvedValue(null);
    await expect(
      controller.file("org-1", actor, "order-1", "file-other-org"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.exporterAttachment.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        orderId: "order-1",
        id: "file-other-org",
      },
    });
  });
  it("does not let accountants replace the exporter company profile", async () => {
    db.organizationMember.findUnique.mockResolvedValue({ role: "ACCOUNTANT" });
    await expect(controller.profile("org-1", actor, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
