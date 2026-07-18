import Hero from '../components/Home/Hero';
import Mission from '../components/Home/Mission';
import CollaborativeResearch from '../components/Home/CollaborativeResearch';
import Stats from '../components/Home/Stats';

const Home = () => {
  return (
    <div>
        <Hero />
        <Mission />
        <CollaborativeResearch />
        <Stats />
    </div>
  );
};

export default Home;