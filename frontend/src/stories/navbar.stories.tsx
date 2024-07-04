import type { Meta, StoryObj } from '@storybook/react'
import NavBar from '../components/navbar.tsx'

const meta = {
  title: 'Components/Common/NavBar',
  component: NavBar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      source: { type: 'code' }
    }
  },
} satisfies Meta<typeof NavBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'desktop'
    }
  }
};
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    }
  }
};
