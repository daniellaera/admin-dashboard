import { Outlet } from "react-router-dom";
import { Footer } from "../components/shared/Footer";
import { Limiter } from "../components/shared/Limiter";
import Nav from "../components/shared/Nav";
import { PromoBanner } from "../components/shared/PromoBanner";

function LandingLayout() {
  return (
    <>
      <PromoBanner />
      <Nav />
      <Limiter pt="65px">
        <Outlet />
      </Limiter>
      <Footer />
    </>
  );
}

export { LandingLayout };
