"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import ReportIcon from "@mui/icons-material/Report";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";

const _ERROR_OPTIONS = ["alert", "warning", "error"] as const;
type ERROR = typeof _ERROR_OPTIONS; // type x = readonly ['op1', 'op2', ...]
type ERROR_OPTIONS_TYPE = ERROR[number];

export interface ERROR_FEEDBACK {
  severity: ERROR_OPTIONS_TYPE;
  message: string;
  dismissible: boolean;
  dissmissFunction?(): void;
}

function icon(severity: string) {
  if (severity == "error") {
    return <ErrorIcon className={`text-red-400 text-5xl`} />;
  } else if (severity == "warning") {
    return <WarningIcon className={`text-orange-400 text-5xl`} />;
  }

  return <ReportIcon className={`text-yellow-400 text-5xl`} />;
}

function dismissBtn(severity: string, dissmissFunction: () => void) {
  if (severity == "error") {
    return (
      <button
        className="mt-4 bg-red-400 text-black p-3 font-bold hover:scale-110"
        onClick={dissmissFunction}
      >
        OK
      </button>
    );
  } else if (severity == "warning") {
    return (
      <button
        className="mt-4 bg-orange-400 text-black p-3 font-bold hover:scale-110"
        onClick={dissmissFunction}
      >
        OK
      </button>
    );
  }

  return (
    <button
      className="mt-4 bg-yellow-400 text-black p-3 font-bold hover:scale-110"
      onClick={dissmissFunction}
    >
      OK
    </button>
  );
}

export default function ErrorModal({ error }: { error: ERROR_FEEDBACK }) {
  if (error.dismissible && !error.dissmissFunction)
    throw new Error("Dissmissible Error missing dissmissFunction!");

  return (
    <>
      <Transition appear show={true} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={
            error.dismissible
              ? () => {
                  error.dissmissFunction!();
                }
              : () => null
          }
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden bg-gray-500 p-4 shadow-xl transition-all flex flex-col items-center text-white">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {icon(error.severity)}
                  </Dialog.Title>
                  <div className="flex w-96 flex-wrap justify-center [overflow-wrap:anywhere]">
                    <span>{error.message}</span>
                  </div>

                  {error.dismissible && error.dissmissFunction ? (
                    dismissBtn(error.severity, error.dissmissFunction)
                  ) : (
                    <></>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
