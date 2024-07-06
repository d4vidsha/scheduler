import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react"
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline"
import { Link } from "@tanstack/react-router"
import { Calendar, CheckSquare2 } from "lucide-react"
import { useState } from "react"
import { ModeToggle } from "./mode-toggle"

import UserMenu from "./user-menu"

const navigation = [
  { icon: Calendar, title: "Calendar", path: "/" },
  { icon: CheckSquare2, title: "Tasks", path: "/items" },
]

const NavBar = () => {
  const [navIndex, setNavIndex] = useState(0)

  function handleClick(index: number) {
    setNavIndex(index)
  }

  return (
    <Disclosure as="nav" className="bg-background border-b">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
            <div className="relative flex h-16 items-center justify-between">
              {/* Mobile menu button*/}
              <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                <DisclosureButton className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </DisclosureButton>
              </div>

              {/* Left side navigation */}
              <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                <div className="flex flex-shrink-0 items-center">
                  <img
                    className="h-8 w-auto"
                    src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=500"
                    alt="Scheduler"
                  />
                </div>
                <div className="hidden sm:ml-6 sm:block">
                  <div className="flex space-x-4">
                    {navigation.map((item, index) => (
                      <Link
                        key={item.title}
                        to={item.path}
                        aria-current={index === navIndex ? "page" : undefined}
                        className={buttonVariants({
                          variant: index === navIndex ? "default" : "ghost",
                        })}
                        onClick={() => handleClick(index)}
                      >
                        <div className="flex items-center">
                          <item.icon className="" />
                          <div className="ml-2">{item.title}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right side navigation */}
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                <ModeToggle />
                <UserMenu />
              </div>
            </div>
          </div>

          {/* Mobile menu panel */}
          <DisclosurePanel className="sm:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {navigation.map((item, index) => (
                <DisclosureButton
                  key={item.title}
                  as={Link}
                  to={item.path}
                  className={cn(
                    "text-gray-300 hover:bg-gray-700 hover:text-white block rounded-md px-3 py-2 text-sm font-medium",
                    index === navIndex && "bg-gray-900 text-white",
                  )}
                  aria-current={index === navIndex ? "page" : undefined}
                >
                  {item.title}
                </DisclosureButton>
              ))}
            </div>
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  )
}

export default NavBar
