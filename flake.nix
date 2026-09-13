{
  description = "n8n-nodes-paheko";

  inputs = {
    nixpkgs.url = "github:NixOs/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        nodejs = pkgs.nodejs_26;
      in {
        devShells.default = pkgs.mkShell {
          nativeBuildInputs = [ nodejs ];
          shellHook = ''
            export PATH="$PWD/node_modules/.bin:$PATH"
            echo "n8n-nodes-paheko dev shell"
            echo "Node.js $(node --version)"
            echo "Run 'N8N_PORT=8888 npx n8n' to start n8n"
          '';
        };
      }
    );
}
