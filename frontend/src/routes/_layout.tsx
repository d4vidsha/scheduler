import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import Sidebar from "../components/Common/Sidebar";
import UserMenu from "../components/Common/UserMenu";
import useAuth, { isLoggedIn } from "../hooks/useAuth";
import { Spinner } from "@/components/Common/Spinner";
import NavBar from "@/components/navbar";

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      });
    }
  },
});

function Layout() {
  const { isLoading } = useAuth();

  return (
    <>
      <NavBar />
      <div className="flex max-w-large h-auto relative">
        {/* <Sidebar /> */}
        {isLoading ? (
          <div className="flex justify-center items-center h-screen w-full">
            <Spinner size="large" />
          </div>
        ) : (
          <Outlet />
        )}
      </div>
    </>
  );
}
