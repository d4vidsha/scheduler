import { useState } from "react";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Calendar, CheckSquare2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";

const navigation = [
  { icon: Calendar, title: "Calendar", path: "/" },
  { icon: CheckSquare2, title: "Tasks", path: "/items" },
];

const NavBar = () => {
  const [navIndex, setNavIndex] = useState(0);

  function handleClick(index: number) {
    setNavIndex(index);
  }
  const { logout } = useAuth();

  const handleLogout = async () => {
    logout();
  };

  return (
    <Disclosure as="nav" className="bg-background">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
            <div className="relative flex h-16 items-center justify-between">
              <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                {/* Mobile menu button*/}
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
                        aria-current={index == navIndex ? "page" : undefined}
                        className={buttonVariants({
                          variant: index == navIndex ? "default" : "ghost",
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
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                <ModeToggle />

                {/* Profile dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="relative ml-3">
                      <AvatarImage src="https://github.com/d4vidsha.png" />
                      <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {/* <DropdownMenuItem asChild>
                        <Link to="/settings">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                          <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                        </Link>
                      </DropdownMenuItem> */}

                      <DropdownMenuItem asChild>
                        <Link to="/settings">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                          <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin">
                          <Users className="mr-2 h-4 w-4" />
                          <span>User Management</span>
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                      <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* <UserMenu /> */}

                {/* <Menu as="div" className="relative ml-3">
                <div>
                  <MenuButton className="relative flex rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                    <span className="absolute -inset-1.5" />
                    <span className="sr-only">Open user menu</span>
                    <img
                      className="h-8 w-8 rounded-full"
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      alt=""
                    />
                  </MenuButton>
                </div>
                <MenuItems
                  transition
                  className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                >
                  <MenuItem>
                    {({ focus }) => (
                      <a
                        href="#"
                        className={cn( 'block px-4 py-2 text-sm text-gray-700', focus && 'bg-gray-100' )}
                      >
                        Your Profile
                      </a>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ focus }) => (
                      <a
                        href="#"
                        className={cn( 'block px-4 py-2 text-sm text-gray-700', focus && 'bg-gray-100' )}
                      >
                        Settings
                      </a>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ focus }) => (
                      <a
                        href="#"
                        className={cn( 'block px-4 py-2 text-sm text-gray-700', focus && 'bg-gray-100' )}
                      >
                        Sign out
                      </a>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ focus }) => (
                      <a
                        href="#"
                        className={classNames(focus ? 'bg-gray-100' : '', 'block px-4 py-2 text-sm text-gray-700')}
                      >
                        Sign out
                      </a>
                    )}
                  </MenuItem>
                </MenuItems>
              </Menu> */}
              </div>
            </div>
          </div>

          <DisclosurePanel className="sm:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {navigation.map((item, index) => (
                <DisclosureButton
                  key={item.title}
                  as={Link}
                  to={item.path}
                  className={cn(
                    "text-gray-300 hover:bg-gray-700 hover:text-white block rounded-md px-3 py-2 text-sm font-medium",
                    index == navIndex && "bg-gray-900 text-white"
                  )}
                  aria-current={index == navIndex ? "page" : undefined}
                >
                  {item.title}
                </DisclosureButton>
              ))}
            </div>
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  );
};

export default NavBar;
