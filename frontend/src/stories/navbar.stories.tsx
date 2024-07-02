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
    tags: ['autodocs'],
  } satisfies Meta<typeof NavBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dashboard: Story = {
};
