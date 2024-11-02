# Install script for directory: /Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib

# Set the install prefix
if(NOT DEFINED CMAKE_INSTALL_PREFIX)
  set(CMAKE_INSTALL_PREFIX "/usr/local")
endif()
string(REGEX REPLACE "/$" "" CMAKE_INSTALL_PREFIX "${CMAKE_INSTALL_PREFIX}")

# Set the install configuration name.
if(NOT DEFINED CMAKE_INSTALL_CONFIG_NAME)
  if(BUILD_TYPE)
    string(REGEX REPLACE "^[^A-Za-z0-9_]+" ""
           CMAKE_INSTALL_CONFIG_NAME "${BUILD_TYPE}")
  else()
    set(CMAKE_INSTALL_CONFIG_NAME "")
  endif()
  message(STATUS "Install configuration: \"${CMAKE_INSTALL_CONFIG_NAME}\"")
endif()

# Set the component getting installed.
if(NOT CMAKE_INSTALL_COMPONENT)
  if(COMPONENT)
    message(STATUS "Install component: \"${COMPONENT}\"")
    set(CMAKE_INSTALL_COMPONENT "${COMPONENT}")
  else()
    set(CMAKE_INSTALL_COMPONENT)
  endif()
endif()

# Is this installation the result of a crosscompile?
if(NOT DEFINED CMAKE_CROSSCOMPILING)
  set(CMAKE_CROSSCOMPILING "FALSE")
endif()

# Set path to fallback-tool for dependency-resolution.
if(NOT DEFINED CMAKE_OBJDUMP)
  set(CMAKE_OBJDUMP "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/objdump")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib" TYPE STATIC_LIBRARY FILES "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/build/libGKlib.a")
  if(EXISTS "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/libGKlib.a" AND
     NOT IS_SYMLINK "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/libGKlib.a")
    execute_process(COMMAND "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/ranlib" "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/libGKlib.a")
  endif()
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include" TYPE FILE FILES
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/GKlib.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/gk_arch.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/gk_defs.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/gk_externs.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/gk_getopt.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/gk_macros.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/gk_mkblas.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/gk_mkmemory.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/gk_mkpqueue.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/gk_mkpqueue2.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/gk_mkrandom.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/gk_mksort.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/gk_mkutils.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/gk_proto.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/gk_struct.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/gk_types.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/gkregex.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/ms_inttypes.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/ms_stat.h"
    "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/ms_stdint.h"
    )
endif()

if(NOT CMAKE_INSTALL_LOCAL_ONLY)
  # Include the install script for each subdirectory.
  include("/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/build/test/cmake_install.cmake")

endif()

if(CMAKE_INSTALL_COMPONENT)
  if(CMAKE_INSTALL_COMPONENT MATCHES "^[a-zA-Z0-9_.+-]+$")
    set(CMAKE_INSTALL_MANIFEST "install_manifest_${CMAKE_INSTALL_COMPONENT}.txt")
  else()
    string(MD5 CMAKE_INST_COMP_HASH "${CMAKE_INSTALL_COMPONENT}")
    set(CMAKE_INSTALL_MANIFEST "install_manifest_${CMAKE_INST_COMP_HASH}.txt")
    unset(CMAKE_INST_COMP_HASH)
  endif()
else()
  set(CMAKE_INSTALL_MANIFEST "install_manifest.txt")
endif()

if(NOT CMAKE_INSTALL_LOCAL_ONLY)
  string(REPLACE ";" "\n" CMAKE_INSTALL_MANIFEST_CONTENT
       "${CMAKE_INSTALL_MANIFEST_FILES}")
  file(WRITE "/Users/mac/Downloads/temp/Trident-WEBGPU/src/plugins/meshlets/metis-5.1.0/repo/GKlib/build/${CMAKE_INSTALL_MANIFEST}"
     "${CMAKE_INSTALL_MANIFEST_CONTENT}")
endif()
