import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdoptionContractPDF } from "@/lib/pdf/adoption-contract";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const app = await prisma.adoptionApplication.findUnique({
    where:   { id: params.id },
    include: {
      user:   { select: { name: true, email: true, phone: true, address: true, city: true } },
      animal: {
        include: {
          shelter: {
            select: { id: true, name: true, address: true, city: true, phone: true, email: true },
          },
        },
      },
    },
  });

  if (!app) return Response.json({ error: "Nem található" }, { status: 404 });

  if (app.status !== "APPROVED") {
    return Response.json({ error: "A kérelem nincs elfogadva" }, { status: 400 });
  }

  const isOwner = app.userId === session.user.id;
  const isAdmin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id, shelterId: app.animal.shelter.id },
  });
  if (!isOwner && !isAdmin && session.user.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const contractDate = new Date().toLocaleDateString("hu-HU", {
    year: "numeric", month: "long", day: "numeric",
  });

  const element = React.createElement(AdoptionContractPDF, {
    data: {
      contractDate,
      applicationId: app.id,
      shelter: {
        name:    app.animal.shelter.name,
        address: app.animal.shelter.address,
        city:    app.animal.shelter.city,
        phone:   app.animal.shelter.phone,
        email:   app.animal.shelter.email,
      },
      animal: {
        name:           app.animal.name,
        type:           app.animal.type,
        breed:          app.animal.breed,
        isMicrochipped: app.animal.isMicrochipped,
        isVaccinated:   app.animal.isVaccinated,
        isNeutered:     app.animal.isNeutered,
      },
      adopter: {
        name:    app.user.name,
        email:   app.user.email,
        phone:   app.user.phone,
        address: app.user.address,
        city:    app.user.city,
      },
    },
  }) as React.ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(element);

  const filename = `szerzodes-${app.animal.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length":      buffer.length.toString(),
    },
  });
}
