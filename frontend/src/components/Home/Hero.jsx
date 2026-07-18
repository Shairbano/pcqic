import Heading from "../ui/Heading";
import Text from "../ui/Text";
const Hero = () => {
  return (
    <section className="w-full mt-4">
      <div className="relative w-full overflow-hidden py-[100px] text-center mb-[40px] rounded-b-[60px] shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(28,22,60,0.98),rgba(30,22,60,0.94))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent)]" />

        <div className="relative z-10 px-4 max-w-5xl mx-auto">
          <Heading className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight drop-shadow-lg">
            Welcome to
            <br className="hidden md:block" />
            PMS
          </Heading>

          <Text className="text-gray-300 mx-auto text-base md:text-lg lg:text-xl max-w-3xl font-light tracking-wide leading-relaxed">
            Plan, track, and deliver every project with clarity bringing
            teams, groups, and tasks together in one place.
          </Text>
        </div>
      </div>
    </section>
  );
};

export default Hero;
