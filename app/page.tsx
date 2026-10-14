import { connection } from "next/server";
import { Suspense } from "react";
import { PinboardApp } from "@/components/pinboard/PinboardApp";
import { loadState } from "@/lib/pinboard/db";

async function PinboardWithData() {
  await connection(); // always read the current rows; they may have been edited by hand
  return <PinboardApp initialState={await loadState()} />;
}

export default function Home() {
  return (
    <Suspense fallback={<p className="loading">Loading Pinboard…</p>}>
      <PinboardWithData />
    </Suspense>
  );
}
