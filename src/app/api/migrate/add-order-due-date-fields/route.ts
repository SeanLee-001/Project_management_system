import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    console.log("Starting to add due date fields to orders table...");

    const db = await getDb();

    const fields = [
      { name: 'prepay_due_date', type: 'TIMESTAMP' },
      { name: 'arrival_due_date', type: 'TIMESTAMP' },
      { name: 'acceptance_due_date', type: 'TIMESTAMP' },
      { name: 'warranty_due_date', type: 'TIMESTAMP' },
    ];

    const addedFields: string[] = [];
    const skippedFields: string[] = [];

    for (const field of fields) {
      const checkResult = await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = ${field.name}
      `);

      if (checkResult.rows && checkResult.rows.length > 0) {
        console.log(`${field.name} field already exists in orders table`);
        skippedFields.push(field.name);
        continue;
      }

      await db.execute(sql`
        ALTER TABLE orders
        ADD COLUMN ${sql.identifier(field.name)} ${sql.raw(field.type)}
      `);

      console.log(`${field.name} field added successfully`);
      addedFields.push(field.name);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Added ${addedFields.length} fields to orders table`,
        addedFields,
        skippedFields,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error adding due date fields:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add due date fields",
      },
      { status: 500 }
    );
  }
}
