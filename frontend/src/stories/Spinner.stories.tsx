import type { Meta, StoryObj } from '@storybook/react'
import { Spinner } from '../components/Common/Spinner.tsx'

const meta = {
    title: 'Components/Common/Spinner',
    component: Spinner,
    parameters: {
      layout: 'centered',
      docs: {
        source: { type: 'code' }
      }
    },
    tags: ['autodocs'],
    argTypes: {
      size: {
        options: ['small', 'medium', 'large'],
        control: 'radio',
      },
      show: {
        control: { type: 'boolean' }
      },
      children: {
        control: { type: 'text' }
      }
    },
    args: {
      size: 'medium',
      show: true,
    },
  } satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Medium: Story = {
    args: {
      size: 'medium',
    },
  };

  export const Large: Story = {
    args: {
      size: 'large',
    },
  };
