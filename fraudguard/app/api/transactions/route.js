import { NextResponse } from 'next/server';
import { generateHistoricalTransactions } from '../../../lib/generateTransaction.js';

export async function GET() {
  try {
    const transactions = generateHistoricalTransactions(50);
    return NextResponse.json({ transactions }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate transactions', details: error.message },
      { status: 500 }
    );
  }
}
