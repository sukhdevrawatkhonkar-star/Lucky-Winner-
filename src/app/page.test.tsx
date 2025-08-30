
import { render, screen } from '@testing-library/react';
import HomePage from './page';

// Mock the Header component as it's not relevant to the test
jest.mock('@/components/Header', () => ({
  Header: () => <header>Mocked Header</header>,
}));

// Mock the Marquee component
jest.mock('@/components/Marquee', () => ({
  Marquee: ({ text }: { text: string }) => <div>{text}</div>,
}));

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
}));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn(),
}));


describe('HomePage', () => {
  it('renders the main heading', () => {
    render(<HomePage />);
    const heading = screen.getByText("Today's Games");
    expect(heading).toBeInTheDocument();
  });
});
