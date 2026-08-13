import { Outlet } from "react-router-dom";
import TrialHeader from "./TrialHeader";
import OfflineBanner from "./OfflineBanner";

export default function TrialLayout() {
  return (
    <>
      <TrialHeader />
      <OfflineBanner />
      <main className="page">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </>
  );
}
